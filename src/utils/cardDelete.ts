export async function deleteCardImage(imageUrl: string): Promise<boolean> {
  try {
    console.log('Attempting to delete card image:', imageUrl);
    
    // Skip if the URL is empty or doesn't start with /uploads/
    if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
      console.warn('Invalid image URL for deletion:', imageUrl);
      return false;
    }
    
    const response = await fetch('/api/delete-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath: imageUrl }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error deleting card image:', data.error);
      return false;
    }
    
    console.log('Card image deleted successfully:', imageUrl);
    return true;
  } catch (error) {
    console.error('Failed to delete card image:', error);
    return false;
  }
}
