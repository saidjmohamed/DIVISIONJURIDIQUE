// ILOVEPDF API Client - Official Workflow
// Free tier: 250 documents/month
// Docs: https://developer.ilovepdf.com/docs/api
//
// Workflow:
// 1. POST /v1/auth → get JWT token
// 2. GET /v1/start/{tool} → get task ID + dynamic server URL
// 3. POST {server}/v1/upload → upload file, get server_filename
// 4. POST {server}/v1/process → process with tool params
// 5. GET {server}/v1/download/{taskId} → download result

const ILOVEPDF_AUTH_URL = "https://api.ilovepdf.com/v1/auth";
const ILOVEPDF_API_BASE = "https://api.ilovepdf.com/v1";

export type IlovePdfTool =
  | "compress"
  | "merge"
  | "split"
  | "office"
  | "htmlpdf"
  | "pdfjpg"
  | "imagepdf"
  | "pdfa"
  | "watermark"
  | "pagenumber"
  | "unlock"
  | "protect"
  | "rotate"
  | "repair"
  | "sign"
  | "extract"
  | "ocr"
  | "validatepdfa";

interface StartResponse {
  server: string;
  task: string;
  remaining_files: number;
  remaining_credits: number;
}

interface UploadResponse {
  server_filename: string;
  pdf_pages?: string[];
  pdf_page_number?: number;
}

interface ProcessResponse {
  download_filename: string;
  filesize: number;
  output_filesize: number;
  output_filenumber: number;
  output_extensions: string;
  timer: string;
  status: string;
  [key: string]: unknown;
}

// Step 1: Authenticate
export async function getAuthToken(publicKey: string, secretKey: string): Promise<string> {
  const response = await fetch(ILOVEPDF_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_key: publicKey, secret_key: secretKey }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`ILOVEPDF auth failed (${response.status}): ${errText}`);
  }
  const data = await response.json();
  return data.token;
}

// Step 2: Start a task - returns dynamic server URL + task ID
export async function startTask(
  token: string,
  tool: IlovePdfTool
): Promise<{ taskId: string; server: string }> {
  const response = await fetch(`${ILOVEPDF_API_BASE}/start/${tool}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`ILOVEPDF start failed (${response.status}): ${errText}`);
  }
  const data: StartResponse = await response.json();
  return { taskId: data.task, server: data.server };
}

// Step 3: Upload file to the dynamic server
export async function uploadFile(
  token: string,
  server: string,
  taskId: string,
  file: File | Blob,
  fileName?: string
): Promise<string> {
  const formData = new FormData();
  formData.append("task", taskId);
  formData.append("file", file, fileName || "file.pdf");

  const response = await fetch(`https://${server}/v1/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`ILOVEPDF upload failed (${response.status}): ${errText}`);
  }
  const data: UploadResponse = await response.json();
  return data.server_filename;
}

// Step 4: Process the task
export async function processTask(
  token: string,
  server: string,
  taskId: string,
  tool: IlovePdfTool,
  files: Array<{ server_filename: string; filename: string }>,
  options?: Record<string, unknown>
): Promise<ProcessResponse> {
  const response = await fetch(`https://${server}/v1/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      task: taskId,
      tool: tool,
      files: files,
      ...(options || {}),
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`ILOVEPDF process failed (${response.status}): ${errText}`);
  }
  return response.json();
}

// Step 5: Download the result
export async function downloadResult(
  token: string,
  server: string,
  taskId: string
): Promise<ArrayBuffer> {
  const response = await fetch(`https://${server}/v1/download/${taskId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`ILOVEPDF download failed (${response.status}): ${errText}`);
  }
  return response.arrayBuffer();
}

// Complete workflow helper: auth + start + upload + process + download
export async function processFile(
  publicKey: string,
  secretKey: string,
  tool: IlovePdfTool,
  file: File | Blob,
  fileName: string,
  options?: Record<string, unknown>
): Promise<ArrayBuffer> {
  const token = await getAuthToken(publicKey, secretKey);
  const { taskId, server } = await startTask(token, tool);
  const serverFilename = await uploadFile(token, server, taskId, file, fileName);
  await processTask(
    token,
    server,
    taskId,
    tool,
    [{ server_filename: serverFilename, filename: fileName }],
    options
  );
  return downloadResult(token, server, taskId);
}

// Complete workflow for multiple files (merge, etc.)
export async function processMultipleFiles(
  publicKey: string,
  secretKey: string,
  tool: IlovePdfTool,
  files: Array<{ file: File | Blob; fileName: string }>,
  options?: Record<string, unknown>
): Promise<ArrayBuffer> {
  const token = await getAuthToken(publicKey, secretKey);
  const { taskId, server } = await startTask(token, tool);

  const uploadedFiles: Array<{ server_filename: string; filename: string }> = [];
  for (const { file, fileName } of files) {
    const serverFilename = await uploadFile(token, server, taskId, file, fileName);
    uploadedFiles.push({ server_filename: serverFilename, filename: fileName });
  }

  await processTask(token, server, taskId, tool, uploadedFiles, options);
  return downloadResult(token, server, taskId);
}
