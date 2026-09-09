import mongoose from "mongoose";
import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { notifyUsers } from "./notifyUsers";
import labResults from "../models/labResults";
import invoice from "../models/invoice";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY!);

export const admitPatient = inngest.createFunction(
  { id: "admit-patient" },
  { event: "patient/admitted" },
  async ({ event, step }) => {
    // Get data
    const { patientId, admissionReason } = event.data;

    // User collection
    const collection = mongoose.connection.collection("user");

    // STEP 1: Fetch patient, doctors and nurses
    const data = await step.run("fetch-hospital-data", async () => {
      // Patient
      const patient = await collection.findOne({
        _id: new mongoose.Types.ObjectId(patientId),
      });

      // Doctors
      const doctors = await collection
        .find({ role: "doctor", status: "active" })
        .toArray();

      // Nurses
      const nurses = await collection
        .find({ role: "nurse", status: "active" })
        .toArray();

      return {
        patient,
        doctors,
        nurses,
      };
    });

    // Throw error if patient, doctor or nurse is missing
    if (
      !data.patient ||
      data.doctors.length === 0 ||
      data.nurses.length === 0
    ) {
      throw new NonRetriableError(
        "Missing patient or active staff to complete triage.",
      );
    }

    // STEP 2: Ask Gemini AI to assign doctor and nurse
    const aiAssignment = await step.run("ai-triage", async () => {
      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      // Patient data
      const patientDataStr = `Age: ${data.patient!.age}, Gender: ${data.patient!.gender}, History: ${data.patient!.medicalHistory}. Issue: ${admissionReason}`;

      // Doctor data
      const doctorDataStr = data.doctors
        .map(
          (d) =>
            `ID: ${d._id.toString()}, Name: ${d.name}, Spec: ${d.specialization}, Dept: ${d.department}`,
        )
        .join("\n");

      // Nurse data
      const nurseDataStr = data.nurses
        .map(
          (n) =>
            `ID: ${n._id.toString()}, Name: ${n.name}, Dept: ${n.department}`,
        )
        .join("\n");

      // Prompt
      const prompt = `
You are an expert Hospital Triage AI.

Match this patient with the best Doctor and Nurse.

PATIENT:
${patientDataStr}

AVAILABLE DOCTORS:
${doctorDataStr}

AVAILABLE NURSES:
${nurseDataStr}

Respond ONLY with a valid JSON object:

{
  "doctorId": "id",
  "doctorName": "name",
  "nurseId": "id",
  "nurseName": "name",
  "reasoning": "Clinical reasoning for this assignment."
}
`;

      // Gemini response
      const result = await model.generateContent(prompt);

      const text = result.response.text();

      // Clean markdown if Gemini returns ```json
      const cleanJson = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      return JSON.parse(cleanJson);
    });

    // STEP 3: Update patient record
    const updatedPatient = await step.run("update-database", async () => {
      const updatePayload = {
        status: "admitted",
        admissionReason,
        assignedDoctorId: aiAssignment.doctorId,
        assignedDoctorName: aiAssignment.doctorName,
        assignedNurseId: aiAssignment.nurseId,
        assignedNurseName: aiAssignment.nurseName,
        triageReasoning: aiAssignment.reasoning,
      };

      await collection.updateOne(
        {
          _id: new mongoose.Types.ObjectId(patientId),
        },
        {
          $set: updatePayload,
        },
      );

      // Return updated patient
      return await collection.findOne({
        _id: new mongoose.Types.ObjectId(patientId),
      });
    });

    // STEP 4: Notify doctor and nurse
    await step.run("send-notification", async () => {
      await notifyUsers(
        aiAssignment.doctorId,
        aiAssignment.nurseId,
        "Patient Assigned",
        `You have been assigned to a new patient: ${updatedPatient?.name}`,
        `/patient/${patientId}`,
        "assignment",
      );
    });

    return {
      success: true,
      aiAssignment,
      updatedPatient,
    };
  },
);

export const analyzeXRayJob = inngest.createFunction(
  { id: "analyze-xray" },
  { event: "labResult/created" },
  async ({ event, step }) => {
    /*
     * Only trust the lab result ID from the event.
     *
     * The image URL and body part are loaded from
     * MongoDB below instead of trusting event data.
     */
    const { labResultId } = event.data;

    /*
     * Validate the lab result ID.
     */
    if (
      !labResultId ||
      typeof labResultId !== "string" ||
      !mongoose.Types.ObjectId.isValid(labResultId)
    ) {
      throw new NonRetriableError(
        "Invalid lab result ID.",
      );
    }

    /*
     * STEP 1:
     * Fetch the actual lab result from MongoDB.
     */
    const labResult = await step.run(
      "fetch-lab-result",
      async () => {
        const result = await labResults
          .findById(labResultId)
          .lean();

        if (!result) {
          throw new NonRetriableError(
            "Lab result not found.",
          );
        }

        if (!result.imageUrl) {
          throw new NonRetriableError(
            "Lab result does not contain an X-Ray image.",
          );
        }

        return {
          id: result._id.toString(),
          imageUrl: result.imageUrl,
          bodyPart: result.bodyPart || "body part",
        };
      },
    );

    /*
     * STEP 2:
     * Download the image using ONLY the URL stored
     * in the trusted LabResult document.
     */
    const aiAnalysis = await step.run(
      "analyze-image",
      async () => {
        const response = await fetch(
          labResult.imageUrl,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to download X-Ray image: ${response.status} ${response.statusText}`,
          );
        }

        /*
         * Convert image to Base64 inside this step.
         *
         * Do not return the Base64 image from an
         * Inngest step because it can exceed payload limits.
         */
        const arrayBuffer =
          await response.arrayBuffer();

        const imageBase64 = Buffer.from(
          arrayBuffer,
        ).toString("base64");

        /*
         * Detect actual MIME type from the response.
         */
        const mimeType =
          response.headers
            .get("content-type")
            ?.split(";")[0] ||
          "image/jpeg";

        /*
         * Gemini model.
         */
        const model =
          genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
          });

        /*
         * AI prompt.
         */
        const prompt = `
You are an expert AI radiologist.

Analyze this ${labResult.bodyPart} X-Ray image.

Provide a structured response:

1. Key Findings
2. Potential Abnormalities
3. Summary

Keep the response clinical and concise.

Important:
- Do not claim a definitive diagnosis.
- Clearly mention uncertainty where appropriate.
- End with a medical disclaimer.
`;

        /*
         * Image data for Gemini.
         */
        const imageParts = [
          {
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          },
        ];

        /*
         * Send image + prompt to Gemini.
         */
        const result =
          await model.generateContent([
            prompt,
            ...imageParts,
          ]);

        return result.response.text();
      },
    );

    /*
     * STEP 3:
     * Update the same lab result.
     *
     * We use the validated MongoDB ID from the
     * original lookup.
     */
    const updatedLab = await step.run(
      "update-db",
      async () => {
        const updatedLabResult =
          await labResults
            .findByIdAndUpdate(
              labResult.id,
              {
                aiAnalysis,
                status: "analyzed",
              },
              {
                new: true,
              },
            )
            .lean();

        if (!updatedLabResult) {
          throw new NonRetriableError(
            "Lab result not found.",
          );
        }

        /*
         * Fetch patient manually from the user
         * collection while excluding sensitive fields.
         */
        const patient =
          await mongoose.connection
            .collection("user")
            .findOne(
              {
                _id: new mongoose.Types.ObjectId(
                  updatedLabResult.patient.toString(),
                ),
              },
              {
                projection: {
                  password: 0,
                  emailVerified: 0,
                },
              },
            );

        /*
         * Attach patient information.
         */
        const resultWithPatient = {
          ...updatedLabResult,
          patient: patient || null,
        };

        return resultWithPatient;
      },
    );

    /*
     * STEP 4:
     * Notify assigned doctor and nurse.
     */
    await step.run(
      "send-notification",
      async () => {
        const assignedDoctorId =
          updatedLab?.patient?.assignedDoctorId?.toString() ||
          "";

        const assignedNurseId =
          updatedLab?.patient?.assignedNurseId?.toString() ||
          "";

        /*
         * No assigned staff means there is nobody
         * to notify.
         */
        if (
          !assignedDoctorId &&
          !assignedNurseId
        ) {
          console.log(
            "No assigned doctor or nurse found. Skipping lab result notification.",
          );

          return;
        }

        await notifyUsers(
          assignedDoctorId,
          assignedNurseId,
          "Lab Result Analyzed",
          `Your lab result for ${updatedLab?.testType} has been analyzed.`,
          `/patients`,
          "lab_result",
        );
      },
    );

    return {
      success: true,
      labResultId: labResult.id,
      status: "analyzed",
    };
  },
);

export const addChargeToInvoice = inngest.createFunction(
  { id: "add-medical-charge" },
  { event: "billing/charge.added" },
  async ({ event, step }) => {
    const {
      patientId,
      description,
      priceInCents,
    } = event.data;

    /*
     * Validate patient ID.
     */
    if (
      !patientId ||
      typeof patientId !== "string" ||
      !mongoose.Types.ObjectId.isValid(patientId)
    ) {
      throw new NonRetriableError(
        "Invalid patient ID.",
      );
    }

    /*
     * Validate description.
     */
    if (
      !description ||
      typeof description !== "string"
    ) {
      throw new NonRetriableError(
        "Invalid charge description.",
      );
    }

    /*
     * Validate price.
     *
     * Charges must be positive whole cents.
     */
    if (
      typeof priceInCents !== "number" ||
      !Number.isInteger(priceInCents) ||
      priceInCents <= 0
    ) {
      throw new NonRetriableError(
        "Invalid charge amount.",
      );
    }

    /*
     * Verify that the patient actually exists.
     */
    const patientExists = await step.run(
      "verify-patient",
      async () => {
        const patient =
          await mongoose.connection
            .collection("user")
            .findOne(
              {
                _id: new mongoose.Types.ObjectId(
                  patientId,
                ),
                role: "patient",
              },
              {
                projection: {
                  _id: 1,
                },
              },
            );

        return !!patient;
      },
    );

    if (!patientExists) {
      throw new NonRetriableError(
        "Patient not found.",
      );
    }

    /*
     * Find existing draft invoice.
     */
    let inv = await invoice.findOne({
      patientId,
      status: "draft",
    });

    await step.run(
      "create-invoice",
      async () => {
        /*
         * Find existing draft invoice or
         * create a new one.
         */
        if (!inv) {
          inv = new invoice({
            patientId,
            items: [],
            totalAmount: 0,
          });
        }

        /*
         * Add itemized charge.
         */
        inv.items.push({
          description: description.trim(),
          quantity: 1,
          unitPrice: priceInCents,
          totalPrice: priceInCents,
        });

        /*
         * Recalculate total.
         */
        inv.totalAmount += priceInCents;

        await inv.save();
      },
    );

    return {
      success: true,
      invoiceId: inv?._id.toString(),
    };
  },
);