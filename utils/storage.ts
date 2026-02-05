import { supabase } from "@/lib/supabase"

/**
 * Get the public URL for a file in a Supabase storage bucket
 * @param bucketName - The name of the storage bucket
 * @param filePath - The path to the file within the bucket
 * @returns The public URL for the file
 */
export const getStorageUrl = (
  bucketName: string,
  filePath: string,
): string => {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath)
  return data.publicUrl
}

/**
 * Get the public URL for a product image
 * @param imagePath - The path to the image in the product-images bucket
 * @returns The public URL for the product image
 */
export const getProductImageUrl = (imagePath: string): string => {
  return getStorageUrl("product-images", imagePath)
}

/**
 * Upload a file to Supabase storage
 * @param bucketName - The name of the storage bucket
 * @param filePath - The path where the file should be stored
 * @param file - The file to upload
 * @returns The path to the uploaded file or null if upload failed
 */
export const uploadFile = async (
  bucketName: string,
  filePath: string,
  file: File | Blob,
): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (error) {
    console.error("Error uploading file:", error)
    return null
  }

  return data.path
}

/**
 * Delete a file from Supabase storage
 * @param bucketName - The name of the storage bucket
 * @param filePath - The path to the file to delete
 * @returns True if deletion was successful, false otherwise
 */
export const deleteFile = async (
  bucketName: string,
  filePath: string,
): Promise<boolean> => {
  const { error } = await supabase.storage.from(bucketName).remove([filePath])

  if (error) {
    console.error("Error deleting file:", error)
    return false
  }

  return true
}
