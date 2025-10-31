
// --- 1. Supabase Client Setup ---
const SUPABASE_URL = 'https://iasxhdjlrbwycgfelkbn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlhc3hoZGpscmJ3eWNnZmVsa2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDQxNzIsImV4cCI6MjA3NzM4MDE3Mn0.RUdAuTHvE1xji56TyuNjbMWVMcxRsHhy7-Idf7tdqlM';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. Get Form Elements ---
const projectForm = document.getElementById('project-form');
const submitButton = document.getElementById('submit-button');
const statusMessage = document.getElementById('status-message');
const addMemberBtn = document.getElementById('add-member-btn');
const teamMembersList = document.getElementById('team-members-list');

// --- 3. "Add Team Member" Button Logic ---
addMemberBtn.addEventListener('click', () => {
    // Create the new row div
    const row = document.createElement('div');
    row.className = 'team-member-row';

    // Create the Name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'team-name';
    nameInput.placeholder = 'Member Name';
    nameInput.required = true;

    // Create the Photo input
    const photoInput = document.createElement('input');
    photoInput.type = 'file';
    photoInput.className = 'team-photo';
    photoInput.accept = 'image/png, image/jpeg';
    photoInput.required = true;

    // Create the Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-member-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => {
        row.remove(); // Remove this row when clicked
    };

    // Add inputs and button to the row
    row.appendChild(nameInput);
    row.appendChild(photoInput);
    row.appendChild(removeBtn);

    // Add the new row to the list
    teamMembersList.appendChild(row);
});

// --- 4. Main Form Submit Logic ---
projectForm.addEventListener('submit', async (event) => {
    event.preventDefault(); 
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    statusMessage.textContent = '';
    statusMessage.className = '';

    try {
        // --- Get Main Project Files ---
        const formData = new FormData(projectForm);
        const thumbnailFile = formData.get('thumbnail_file');
        const imageFile = formData.get('image_file');

        if (!thumbnailFile || !imageFile) {
            throw new Error('Please select both a thumbnail and a main image.');
        }

        // --- Prepare all file uploads in parallel ---
        const uploadPromises = [];

        // 1. Add Thumbnail upload promise
        const thumbPath = `public/project-thumb-${Date.now()}-${thumbnailFile.name}`;
        uploadPromises.push(supabase.storage.from('project-images').upload(thumbPath, thumbnailFile));

        // 2. Add Main Image upload promise
        const imagePath = `public/project-main-${Date.now()}-${imageFile.name}`;
        uploadPromises.push(supabase.storage.from('project-images').upload(imagePath, imageFile));

        // 3. Add all Team Member photo upload promises
        const teamRows = teamMembersList.querySelectorAll('.team-member-row');
        const teamUploadData = []; // To hold name and file path

        for (const row of teamRows) {
            const name = row.querySelector('.team-name').value;
            const file = row.querySelector('.team-photo').files[0];

            if (name && file) {
                const teamPhotoPath = `public/team-photo-${Date.now()}-${file.name}`;
                teamUploadData.push({ name: name, path: teamPhotoPath });
                uploadPromises.push(supabase.storage.from('project-images').upload(teamPhotoPath, file));
            }
        }
        
        // --- Run all uploads at the same time ---
        const uploadResults = await Promise.all(uploadPromises);

        // Check for any errors during upload
        for (const result of uploadResults) {
            if (result.error) throw result.error;
        }

        // --- Get Public URLs for all uploaded files ---
        const [thumbResult, imageResult, ...teamPhotoResults] = uploadResults;

        const thumbUrl = supabase.storage.from('project-images').getPublicUrl(thumbResult.data.path).data.publicUrl;
        const imageUrl = supabase.storage.from('project-images').getPublicUrl(imageResult.data.path).data.publicUrl;

        // Build the team_members JSON array
        const teamArray = teamPhotoResults.map((result, index) => {
            const publicUrl = supabase.storage.from('project-images').getPublicUrl(result.data.path).data.publicUrl;
            return {
                name: teamUploadData[index].name,
                photo: publicUrl
            };
        });

        // --- Parse Text Data ---
        const tagsArray = formData.get('tags')
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag); 

        // --- Create Final Project Object ---
        const newProject = {
            title: formData.get('title'),
            description: formData.get('description'),
            thumbnail_url: thumbUrl,
            image_url: imageUrl,
            project_link: formData.get('project_link'),
            tags: tagsArray,
            team_members: teamArray
        };

        // --- Insert into Supabase Database ---
        const { error: insertError } = await supabase
            .from('projects') 
            .insert([newProject]);

        if (insertError) {
            throw insertError; 
        }

        // --- Handle Success ---
        statusMessage.textContent = 'Success! Project added to the gallery.';
        statusMessage.className = 'success';
        projectForm.reset(); 
        teamMembersList.innerHTML = ''; // Clear dynamic fields

    } catch (error) {
        // --- Handle Error ---
        console.error('Error submitting project:', error.message);
        statusMessage.textContent = `Error: ${error.message}`;
        statusMessage.className = 'error';
    } finally {
        // --- Reset Button ---
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Project';
    }
});
