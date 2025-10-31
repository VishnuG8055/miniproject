// --- 1. SUPABASE CLIENT SETUP ---
const SUPABASE_URL = 'https://iasxhdjlrbwycgfelkbn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlhc3hoZGpscmJ3eWNnZmVsa2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDQxNzIsImV4cCI6MjA3NzM4MDE3Mn0.RUdAuTHvE1xji56TyuNjbMWVMcxRsHhy7-Idf7tdqlM';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// --- 2. GET ELEMENT REFERENCES ---
const projectGrid = document.getElementById('project-grid');
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
const closeButton = document.getElementById('close-button');
const body = document.body;
const themeToggle = document.getElementById('theme-toggle'); 

let lastClickedCard = null; 

// --- 3. MODAL FUNCTIONS ---

function openModal(project, cardElement) {
    lastClickedCard = cardElement; 

    // --- 1. Populate modal content ---
    // Note: Using Supabase column names now (e.g., image_url)
    modalContent.querySelector('.modal-image').src = project.image_url;
    modalContent.querySelector('.modal-title').textContent = project.title;
    modalContent.querySelector('.modal-description').textContent = project.description;
    modalContent.querySelector('#modal-cta').href = project.project_link;

    const teamContainer = modalContent.querySelector('#modal-team');
    teamContainer.innerHTML = '';
    // Check if team_members exists and is an array
    if (project.team_members && Array.isArray(project.team_members)) {
        project.team_members.forEach(member => {
            teamContainer.innerHTML += `
                <div class="team-profile">
                    <img src="${member.photo}" alt="${member.name}">
                    <span>${member.name}</span>
                </div>
            `;
        });
    }

    const tagsContainer = modalContent.querySelector('#modal-tags');
    tagsContainer.innerHTML = '';
    // Check if tags exists and is an array
    if (project.tags && Array.isArray(project.tags)) {
        project.tags.forEach(tag => {
            tagsContainer.innerHTML += `<span class="tag">${tag}</span>`;
        });
    }

    // --- 2. Card expansion animation ---
    const cardRect = cardElement.getBoundingClientRect();
    const modalFinalRect = modalContent.getBoundingClientRect();

    const scaleX = cardRect.width / modalFinalRect.width;
    const scaleY = cardRect.height / modalFinalRect.height;
    const translateX = cardRect.left - modalFinalRect.left;
    const translateY = cardRect.top - modalFinalRect.top;

    modalContent.style.transformOrigin = 'top left'; 
    modalContent.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    modalContent.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)'; 

    modalOverlay.classList.add('active');
    body.classList.add('modal-active');
    
    void modalContent.offsetWidth; 

    modalContent.style.transform = 'translate(0, 0) scale(1)';
    
    cardElement.style.opacity = '0';

    // --- 3. Sequential content animation ---
    setTimeout(() => {
        const contentToAnimate = [
            modalContent.querySelector('h3'), // "Team Members" title
            modalContent.querySelector('.team-members'),
            modalContent.querySelectorAll('h3')[1], // "Description" title
            modalContent.querySelector('.modal-description'),
            modalContent.querySelectorAll('h3')[2], // "Technologies" title
            modalContent.querySelector('.tech-tags'),
            modalContent.querySelector('.cta-button')
        ];
        
        modalContent.querySelector('.modal-title').classList.add('visible');

        contentToAnimate.forEach((el, i) => {
            if (el) {
                setTimeout(() => {
                    el.classList.add('visible');
                }, (i + 1) * 75); 
            }
        });
    }, 350); 
}

function closeModal() {
    // --- 1. Hide modal content immediately ---
    const contentToAnimate = [
        ...modalContent.querySelectorAll('.modal-title'),
        ...modalContent.querySelectorAll('h3'),
        ...modalContent.querySelectorAll('.team-members'),
        ...modalContent.querySelectorAll('.modal-description'),
        ...modalContent.querySelectorAll('.tech-tags'),
        ...modalContent.querySelectorAll('.cta-button')
    ];
    contentToAnimate.forEach(el => el.classList.remove('visible'));

    // --- 2. Card shrink animation ---
    if (!lastClickedCard) { 
        modalOverlay.classList.remove('active');
        body.classList.remove('modal-active');
        return;
    }

    const cardRect = lastClickedCard.getBoundingClientRect();
    const modalFinalRect = modalContent.getBoundingClientRect();
    
    const scaleX = cardRect.width / modalFinalRect.width;
    const scaleY = cardRect.height / modalFinalRect.height;
    const translateX = cardRect.left - modalFinalRect.left;
    const translateY = cardRect.top - modalFinalRect.top;

    modalContent.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    
    modalOverlay.classList.remove('active'); 
    body.classList.remove('modal-active'); 
    
    lastClickedCard.style.opacity = '1';

    setTimeout(() => {
        modalContent.style.transform = 'translate(0, 0) scale(1)';
        modalContent.style.transition = 'none';
        lastClickedCard = null;
    }, 350); 
}

// --- 4. PROJECT DISPLAY FUNCTION ---
function displayProjects(projects) {
    projectGrid.innerHTML = ''; 
    
    projects.forEach((project, index) => {
        const card = document.createElement('div');
        card.className = 'project-card';
        // Note: Using Supabase column names
        card.innerHTML = `
            <img src="${project.thumbnail_url}" alt="${project.title} thumbnail">
            <div class="card-title">${project.title}</div>
        `;
        
        card.addEventListener('click', () => openModal(project, card));
        
        projectGrid.appendChild(card);

        // --- Staggered page load animation ---
        setTimeout(() => {
            card.classList.add('visible');
        }, index * 100); 
    });
}

// --- 5. EVENT LISTENERS ---

// Theme toggle
themeToggle.addEventListener('change', () => {
    body.classList.toggle('dark-mode');
});

// Modal close events
closeButton.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.classList.contains('modal-active')) {
        closeModal();
    }
});

// --- 6. NEW: INITIAL LOAD FUNCTION ---
async function loadProjects() {
    try {
        // Fetch all projects from the 'projects' table
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false }); // Show newest projects first

        if (error) {
            throw error;
        }

        // If data is fetched successfully, display it
        displayProjects(data);

    } catch (error) {
        console.error('Error fetching projects:', error.message);
        projectGrid.innerHTML = `<p class="error-message">Could not load projects. Error: ${error.message}</p>`;
    }
}

// Call the new load function instead of displayProjects(dummyData)
loadProjects();