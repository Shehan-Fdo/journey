const entryContent = document.getElementById('entryContent');
const moodSelect = document.getElementById('moodSelect');
const saveBtn = document.getElementById('saveBtn');
const entriesList = document.getElementById('entriesList');
const themeToggle = document.getElementById('themeToggle');

const sentinel = document.getElementById('infiniteScrollSentinel');

let editingId = null;
let currentOffset = 0;
const limit = 10;
let hasMore = true;
let isLoading = false;

// Load entries
async function loadEntries(isInitial = true) {
    if (isLoading || (!isInitial && !hasMore)) return;

    isLoading = true;
    if (isInitial) {
        currentOffset = 0;
        hasMore = true;
        entriesList.innerHTML = '<div class="loading">Loading thoughts...</div>';
    }

    try {
        const res = await fetch(`/api/entries?limit=${limit}&offset=${currentOffset}`);

        if (res.status === 401) {
            window.location.href = '/login';
            return;
        }

        const entries = await res.json();

        // Check if response is an array (success) or an error object
        if (Array.isArray(entries)) {
            if (isInitial) entriesList.innerHTML = '';

            if (entries.length < limit) {
                hasMore = false;
            }

            renderEntries(entries, !isInitial);
            currentOffset += entries.length;

            if (!hasMore && entriesList.children.length > 0) {
                const endMsg = document.createElement('div');
                endMsg.className = 'loading';
                endMsg.textContent = 'All thoughts loaded.';
                endMsg.style.padding = '20px';
                endMsg.style.opacity = '0.5';
                entriesList.appendChild(endMsg);
            }
        } else {
            entriesList.innerHTML = '<div class="loading">Failed to load entries. Database connection error.</div>';
            console.error('API Error:', entries);
        }
    } catch (err) {
        if (isInitial) entriesList.innerHTML = '<div class="loading">Failed to load entries. Check database connection.</div>';
        console.error(err);
    } finally {
        isLoading = false;
    }
}

// Render entries
function renderEntries(entries, append = false) {
    if (entries.length === 0 && !append) {
        entriesList.innerHTML = '<div class="loading">No entries yet. Start writing!</div>';
        return;
    }

    const html = entries.map(entry => {
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
                     <button class="icon-btn edit-btn" onclick="startEdit(${entryId}, '${escapedContent}', '${entry.mood}')" title="Edit">
                        <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                     </button>
                     <button class="icon-btn delete-btn" onclick="deleteEntry(${entryId})" title="Delete">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                     </button>
                </div>
            </div>
            <div class="entry-content truncated" id="content-${entryId}">${entry.content}</div>
            <button class="see-more-btn" id="toggle-${entryId}" onclick="toggleContent(${entryId})">See more</button>
        </div>
    `;
    }).join('');

    if (append) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        while (tempDiv.firstChild) {
            entriesList.appendChild(tempDiv.firstChild);
        }
    } else {
        entriesList.innerHTML = html;
    }

    if (window.lucide) {
        lucide.createIcons();
    }
}

// Infinite Scroll Setup
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore && !isLoading && currentOffset > 0) {
        loadEntries(false);
    }
}, { threshold: 0.1 });

if (sentinel) observer.observe(sentinel);

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

        if (res.status === 401) {
            window.location.href = '/login';
            return;
        }

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

        if (res.status === 401) {
            window.location.href = '/login';
            return;
        }

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
const themeIcon = document.getElementById('themeIcon');
if (themeIcon) {
    themeIcon.setAttribute('data-lucide', savedTheme === 'dark' ? 'sun' : 'moon');
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    if (themeIcon) {
        themeIcon.setAttribute('data-lucide', newTheme === 'dark' ? 'sun' : 'moon');
        lucide.createIcons();
    }
});

// Logout handling
window.logout = async () => {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (err) {
        console.error('Logout failed', err);
    }
};

// Initial Load
loadEntries();

// Initialize Lucide Icons
if (window.lucide) {
    lucide.createIcons();
}
