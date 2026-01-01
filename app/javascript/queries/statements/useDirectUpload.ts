import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadsService } from "../../types/generated/services.gen";
import type { V1_Entities_PresignedUpload, V1_Entities_Statement } from "../../types/generated/types.gen";
import { statementKeys } from "../keys";

interface DirectUploadParams {
  file: File;
  templateId: number;
  accountId?: number;
  onProgress?: (progress: number) => void;
}

/**
 * Direct S3 upload hook
 * 
 * Flow:
 * 1. Get presigned URL from API
 * 2. Upload file directly to S3 (bypasses Rails server)
 * 3. Confirm upload with API to create statement
 * 
 * Benefits:
 * - Faster uploads (direct to S3)
 * - Reduces server load
 * - Better for large files
 */
export const useDirectUpload = () => {
  const queryClient = useQueryClient();

  return useMutation<V1_Entities_Statement, Error, DirectUploadParams>({
    mutationFn: async ({ file, templateId, accountId, onProgress }) => {
      // Step 1: Get presigned URL
      const presignResponse = await UploadsService.postV1UploadsPresign({
        requestBody: {
          filename: file.name,
          content_type: file.type || 'application/octet-stream',
          file_size: file.size,
        },
      }) as V1_Entities_PresignedUpload;

      // Step 2: Upload directly to S3
      // Cast headers from unknown to string (they come from API as string values)
      const headers = Object.fromEntries(
        Object.entries(presignResponse.headers).map(([k, v]) => [k, String(v)])
      );
      
      await uploadToS3(
        presignResponse.upload_url,
        file,
        headers,
        onProgress
      );

      // Step 3: Confirm upload and create statement
      const statement = await UploadsService.postV1UploadsConfirm({
        requestBody: {
          s3_key: presignResponse.s3_key,
          filename: file.name,
          template_id: templateId,
          account_id: accountId,
          file_size: file.size,
        },
      });

      return statement as V1_Entities_Statement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statementKeys.all });
    },
  });
};

/**
 * Upload file directly to S3 using presigned URL
 */
async function uploadToS3(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('S3 upload failed'));
    });

    xhr.open('PUT', url);
    
    // Set headers from presign response
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.send(file);
  });
}

/**
 * Helper to format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
