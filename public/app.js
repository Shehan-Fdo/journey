const entryContent = document.getElementById('entryContent');
const moodSelect = document.getElementById('moodSelect');
const saveBtn = document.getElementById('saveBtn');
const entriesList = document.getElementById('entriesList');
const themeToggle = document.getElementById('themeToggle');

let editingId = null;

// Load entries
async function loadEntries() {
    try {
        const res = await fetch('/api/entries');
        const entries = await res.json();

        // Check if response is an array (success) or an error object
        if (Array.isArray(entries)) {
            renderEntries(entries);
        } else {
            // Handle error response from server
            entriesList.innerHTML = '<div class="loading">Failed to load entries. Database connection error.</div>';
            console.error('API Error:', entries);
        }
    } catch (err) {
        entriesList.innerHTML = '<div class="loading">Failed to load entries. Check database connection.</div>';
        console.error(err);
    }
}

// Render entries
function renderEntries(entries) {
    if (entries.length === 0) {
        entriesList.innerHTML = '<div class="loading">No entries yet. Start writing!</div>';
        return;
    }

    entriesList.innerHTML = entries.map(entry => {
        const entryId = entry.id;
        const escapedContent = entry.content.replace(/'/g, "\\'").replace(/\n/g, '\\n');

        return `
        <div class="entry-card" id="entry-${entryId}">
            <div class="entry-header">
                <div>
                    <span class="date">${new Date(entry.created_at).toLocaleDateString(undefined, {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })}</span>
                    <span class="mood">${entry.mood || ''}</span>
                </div>
                <div class="actions">
                     <button class="icon-btn edit-btn" onclick="startEdit(${entryId}, '${escapedContent}', '${entry.mood}')">✎</button>
                     <button class="icon-btn delete-btn" onclick="deleteEntry(${entryId})">🗑</button>
                </div>
            </div>
            <div class="entry-content truncated" id="content-${entryId}">${entry.content}</div>
            <button class="see-more-btn" id="toggle-${entryId}" onclick="toggleContent(${entryId})">See more</button>
        </div>
    `;
    }).join('');
}

// Toggle content expansion
window.toggleContent = (id) => {
    const contentDiv = document.getElementById(`content-${id}`);
    const toggleBtn = document.getElementById(`toggle-${id}`);

    if (contentDiv.classList.contains('truncated')) {
        contentDiv.classList.remove('truncated');
        toggleBtn.textContent = 'See less';
    } else {
        contentDiv.classList.add('truncated');
        toggleBtn.textContent = 'See more';
    }
};

// Start Edit Mode
window.startEdit = (id, content, mood) => {
    editingId = id;
    entryContent.value = content;
    moodSelect.value = mood || 'neutral';
    saveBtn.textContent = 'Update Entry';
    entryContent.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Delete Entry
window.deleteEntry = async (id) => {
    if (!confirm('Are you sure you want to move this entry to trash?')) return;

    try {
        const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadEntries();
        }
    } catch (err) {
        alert('Failed to delete entry');
    }
};

// Save entry
saveBtn.addEventListener('click', async () => {
    const content = entryContent.value.trim();
    const mood = moodSelect.value;

    if (!content) return;

    saveBtn.disabled = true;
    saveBtn.textContent = editingId ? 'Updating...' : 'Saving...';

    const url = editingId ? `/api/entries/${editingId}` : '/api/entries';
    const method = editingId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, mood })
        });

        if (res.ok) {
            entryContent.value = '';
            editingId = null;
            saveBtn.textContent = 'Log Entry';
            loadEntries();
        }
    } catch (err) {
        console.error(err);
        alert('Failed to save entry');
    } finally {
        saveBtn.disabled = false;
        if (!editingId) saveBtn.textContent = 'Log Entry';
    }
});

// Theme handling
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀' : '☾';

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '☀' : '☾';
});

// Initial Load
loadEntries();
