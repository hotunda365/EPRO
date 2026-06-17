from PIL import Image

# Open the image
img = Image.open(r'c:\Users\Toby-Ng\Documents\EproTel\assets\logo\etsgroup-header-official.png')

# Get dimensions
print(f"Original image size: {img.size}")

# Crop just the small red E logo from the left side (approximately first 60 pixels width)
cropped = img.crop((0, 0, 60, img.height))

# Save as new file
output_path = r'c:\Users\Toby-Ng\Documents\EproTel\assets\logo\ets-logo-small.png'
cropped.save(output_path)

print(f'Cropped logo saved: {output_path}')
print(f'Cropped size: {cropped.size}')
