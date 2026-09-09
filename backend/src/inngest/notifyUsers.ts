import mongoose from "mongoose";
import { getIO } from "../lib/socket";
import Notification from "../models/notification";

const userCollection = () =>
  mongoose.connection.collection("user");

export const notifyUsers = async (
  doctorId: string,
  nurseId: string,
  title: string,
  message: string,
  link: string,
  type:
    | "system"
    | "assignment"
    | "lab_result"
    | "alert",
) => {
  /*
   * Notify doctor.
   */
  if (doctorId) {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      console.warn(
        `Skipping notification: invalid doctor ID ${doctorId}`,
      );
    } else {
      const doctor = await userCollection().findOne(
        {
          _id: new mongoose.Types.ObjectId(doctorId),
          role: "doctor",
        },
        {
          projection: {
            _id: 1,
          },
        },
      );

      if (!doctor) {
        console.warn(
          `Skipping notification: doctor not found ${doctorId}`,
        );
      } else {
        await Notification.create({
          user: doctor._id,
          title,
          message,
          type,
          link,
        });

        /*
         * Emit only to the authenticated doctor's room.
         */
        getIO()
          .to(`user_${doctor._id.toString()}`)
          .emit("new_notification");
      }
    }
  }

  /*
   * Notify nurse.
   */
  if (nurseId) {
    if (!mongoose.Types.ObjectId.isValid(nurseId)) {
      console.warn(
        `Skipping notification: invalid nurse ID ${nurseId}`,
      );
    } else {
      const nurse = await userCollection().findOne(
        {
          _id: new mongoose.Types.ObjectId(nurseId),
          role: "nurse",
        },
        {
          projection: {
            _id: 1,
          },
        },
      );

      if (!nurse) {
        console.warn(
          `Skipping notification: nurse not found ${nurseId}`,
        );
      } else {
        await Notification.create({
          user: nurse._id,
          title,
          message,
          type,
          link,
        });

        /*
         * Emit only to the authenticated nurse's room.
         */
        getIO()
          .to(`user_${nurse._id.toString()}`)
          .emit("new_notification");
      }
    }
  }
};