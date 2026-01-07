const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');

// Auto-resize textarea
chatInput.addEventListener('input', () => {
    chatInput.style.height = '24px';
    const newHeight = Math.min(chatInput.scrollHeight, 144);
    chatInput.style.height = newHeight + 'px';
});


// Send message function
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to UI
    addMessage(message, 'user');
    chatInput.value = '';
    chatInput.style.height = '24px';

    // Disable UI
    chatInput.disabled = true;
    sendBtn.disabled = true;
    typingIndicator.style.display = 'flex';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to get AI response');
        }

        const data = await response.json();
        addMessage(data.response, 'ai');
    } catch (err) {
        console.error(err);
        addMessage('Sorry, I encountered an error. Please try again later.', 'ai');
    } finally {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        typingIndicator.style.display = 'none';
        chatInput.focus();
    }
}

const scrollToBottomBtn = document.getElementById('scrollToBottom');

// Add message to UI
function addMessage(text, sender) {
    const row = document.createElement('div');
    row.className = `message-row ${sender}-row`;

    if (sender === 'user') {
        const cleanedText = text.replace(/`/g, '\\`').replace(/\${/g, '\\${');
        row.innerHTML = `
            <div class="message user-message">${text}</div>
            <div class="user-actions">
                <div class="action-btn" onclick="copyText(this, \`${cleanedText}\`)" title="Copy message">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </div>
                <div class="action-btn" title="Edit message">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </div>
            </div>
        `;
    } else {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        messageDiv.innerHTML = window.marked ? marked.parse(text) : text;
        row.appendChild(messageDiv);
    }

    chatMessages.appendChild(row);
    if (window.lucide) lucide.createIcons();

    // Auto scroll
    scrollToBottom();
}

// Scroll functionality
function scrollToBottom() {
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
}

chatMessages.addEventListener('scroll', () => {
    const isAtBottom = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 100;
    scrollToBottomBtn.classList.toggle('visible', !isAtBottom);
});

if (scrollToBottomBtn) {
    scrollToBottomBtn.addEventListener('click', scrollToBottom);
}

// Copy text utility
window.copyText = (el, text) => {
    navigator.clipboard.writeText(text).then(() => {
        const originalSvg = el.innerHTML;
        const checkSvg = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; color: #4caf50;">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        el.innerHTML = checkSvg;
        setTimeout(() => {
            el.innerHTML = originalSvg;
        }, 2000);
    });
};

// Event listeners
sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Load chat history
async function loadHistory() {
    try {
        const response = await fetch('/api/chat/history');
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        const history = await response.json();

        if (history.length > 0) {
            history.forEach(msg => {
                addMessage(msg.content, msg.role);
            });
        } else {
            addMessage("Hi! I'm your Journey AI. I've read through your journal entries and I'm here to help you reflect, find patterns, or just chat about how you're feeling. What's on your mind?", 'ai');
        }
    } catch (err) {
        console.error('Failed to load history:', err);
        addMessage("Hi! I'm your Journey AI. I'm ready to chat with you.", 'ai');
    }
}

// Reset chat
const resetBtn = document.getElementById('resetChat');
if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to clear your chat history?')) return;

        try {
            const response = await fetch('/api/chat/history', { method: 'DELETE' });
            if (response.ok) {
                chatMessages.innerHTML = '';
                addMessage("Hi! I'm your Journey AI. I've read through your journal entries and I'm here to help you reflect, find patterns, or just chat about how you're feeling. What's on your mind?", 'ai');
            }
        } catch (err) {
            console.error('Failed to reset chat:', err);
        }
    });
}

// Initial load
window.addEventListener('DOMContentLoaded', loadHistory);
