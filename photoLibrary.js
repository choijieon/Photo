let photos = [];
let currentPhoto = null;

// Open the database (you can add IndexedDB later)
function openDatabase() {
    console.log("Database opened (simulation for now)");
}

// Load existing photos (if any, we'll skip for now)
function loadPhotosFromIndexedDB() {
    console.log("Loading photos (none for now)");
}

// Add the event listener to the "Add Photos" button
document.getElementById('addPhotosButton').addEventListener('click', () => {
    const files = document.getElementById('imageInput').files;
    if (files.length === 0) {
        alert("Please select at least one image to upload.");
        return;
    }

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            const photo = {
                src: imageUrl,
                title: '',
                tags: []
            };

            // Extract metadata and generate tags
            const imgElement = new Image();
            imgElement.src = imageUrl;
            imgElement.onload = () => {
                EXIF.getData(imgElement, function() {
                    const allMetaData = EXIF.getAllTags(this);
                    const autoTags = generateTags(allMetaData);
                    photo.tags.push(...autoTags);
                    photos.push(photo);
                    addPhotoToGallery(photo);
                });
            };
        };
        reader.readAsDataURL(file);
    });

    // Reset the file input after processing the files
    document.getElementById('imageInput').value = '';
});

// Function to generate tags from EXIF metadata
function generateTags(metadata) {
    const tags = [];

    if (metadata.GPSLatitude && metadata.GPSLongitude) {
        const locationTag = `Location: ${convertDMSToDD(metadata.GPSLatitude, metadata.GPSLatitudeRef)}, ${convertDMSToDD(metadata.GPSLongitude, metadata.GPSLongitudeRef)}`;
        tags.push(locationTag);
    }

    if (metadata.DateTimeOriginal) {
        const timeTag = `Date: ${formatDateTime(metadata.DateTimeOriginal)}`;
        tags.push(timeTag);
    }

    if (metadata.Make && metadata.Model) {
        const deviceTag = `Device: ${metadata.Make} ${metadata.Model}`;
        tags.push(deviceTag);
    }

    return tags;
}

// Function to convert DMS to decimal degrees
function convertDMSToDD(dms, ref) {
    const degrees = dms[0];
    const minutes = dms[1];
    const seconds = dms[2];
    let dd = degrees + minutes / 60 + seconds / 3600;
    if (ref === "S" || ref === "W") dd *= -1;
    return dd.toFixed(6);
}

// Function to format DateTimeOriginal to a readable date
function formatDateTime(dateTimeOriginal) {
    const dateObj = new Date(dateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
    return dateObj.toLocaleString();
}

// Function to add a photo to the gallery
function addPhotoToGallery(photo) {
    const gallery = document.getElementById('gallery');
    const photoDiv = document.createElement('div');
    photoDiv.className = 'photo-thumbnail';

    // Create an "X" button to delete the photo
    const deleteButton = document.createElement('span');
    deleteButton.textContent = 'X';
    deleteButton.className = 'delete-photo';
    deleteButton.onclick = () => deletePhoto(photo, photoDiv);

    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.title || "Uploaded Photo";
    img.onclick = () => showPhotoDetails(photo);

    const titleDiv = document.createElement('div');
    titleDiv.className = 'photo-title';
    titleDiv.textContent = photo.title || "No Title";

    photoDiv.appendChild(deleteButton);
    photoDiv.appendChild(img);
    photoDiv.appendChild(titleDiv);
    gallery.appendChild(photoDiv);
}

// Function to delete a photo
function deletePhoto(photo, photoDiv) {
    if (confirm("Are you sure you want to delete this photo?")) {
        // Remove the photo from the array
        photos = photos.filter(p => p !== photo);
        // Remove the photo from the gallery
        photoDiv.remove();
        // Hide the detail section if the current photo is deleted
        if (currentPhoto === photo) {
            document.getElementById('detailSection').style.display = 'none';
        }
    }
}

// Show the photo details
function showPhotoDetails(photo) {
    currentPhoto = photo;
    document.getElementById('detailImage').src = photo.src;
    document.getElementById('titleInput').value = photo.title;
    document.getElementById('manualTagsOutput').innerHTML = '';

    // Display existing tags
    photo.tags.forEach(tag => {
        document.getElementById('manualTagsOutput').appendChild(createLabel(tag));
    });

    document.getElementById('detailSection').style.display = 'block';

    // Enable the title save functionality
    document.getElementById('saveTitleButton').disabled = false;
    document.getElementById('saveTitleButton').onclick = saveTitle;

    // Enable the edit button functionality
    document.getElementById('editTitleButton').onclick = () => {
        document.getElementById('titleInput').disabled = false;
        document.getElementById('saveTitleButton').disabled = false;
    };

    // Re-enable tag adding functionality
    document.getElementById('addTagButton').onclick = addCustomTag;
}

// Function to save the title of the photo
function saveTitle() {
    if (currentPhoto) {
        currentPhoto.title = document.getElementById('titleInput').value;
        updateGalleryTitles();
        document.getElementById('titleInput').disabled = true;
        document.getElementById('saveTitleButton').disabled = true;
    }
}

// Function to update gallery titles
function updateGalleryTitles() {
    const galleryItems = document.querySelectorAll('.photo-thumbnail');
    galleryItems.forEach((item, index) => {
        const titleDiv = item.querySelector('.photo-title');
        titleDiv.textContent = photos[index].title || "No Title";
    });
}

// Function to add a custom tag to the photo
function addCustomTag() {
    const tagText = document.getElementById('manualTagInput').value.trim();
    if (tagText && currentPhoto) {
        if (!currentPhoto.tags.includes(tagText)) {
            currentPhoto.tags.push(tagText);
            document.getElementById('manualTagsOutput').appendChild(createLabel(tagText));
            document.getElementById('manualTagInput').value = '';
        }
    }
}

// Function to create a tag label with a delete button
function createLabel(text) {
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = text;

    const deleteButton = document.createElement('span');
    deleteButton.textContent = ' x';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.marginLeft = '100px';
    deleteButton.onclick = () => {
        if (currentPhoto) {
            currentPhoto.tags = currentPhoto.tags.filter(tag => tag !== text);
            label.remove();
        }
    };

    label.appendChild(deleteButton);
    return label;
}

// Handle pre-selected tag buttons
document.querySelectorAll('.pre-tag-button').forEach(button => {
    button.addEventListener('click', () => {
        const tagText = button.getAttribute('data-tag');
        if (currentPhoto && !currentPhoto.tags.includes(tagText)) {
            currentPhoto.tags.push(tagText);
            document.getElementById('manualTagsOutput').appendChild(createLabel(tagText));
        }
    });
});

// Search photos by title or tag
document.getElementById('searchInput').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    document.querySelectorAll('.photo-thumbnail').forEach((photoDiv, index) => {
        const photo = photos[index];
        const matchesTitle = photo.title.toLowerCase().includes(query);
        const matchesTag = photo.tags.some(tag => tag.toLowerCase().includes(query));
        photoDiv.style.display = matchesTitle || matchesTag ? '' : 'none';
    });
});

// Start by opening the "database"
openDatabase();