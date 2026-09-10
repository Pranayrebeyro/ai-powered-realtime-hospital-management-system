import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const UploadButton = generateUploadButton({
  url: `${API_URL}/uploadthing`,
});

export const UploadDropzone = generateUploadDropzone({
  url: `${API_URL}/uploadthing`,
});