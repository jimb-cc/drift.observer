/**
 * drift.observer Terminal
 *
 * Core terminal interface for the Entity communication channel.
 */

const Terminal = {
    // DOM elements
    elements: {
        output: null,
        input: null,
        cursor: null,
        metricsPanel: null,
    },

    // State
    state: {
        inputEnabled: true,
        isTyping: false,
        history: [],
        historyIndex: -1,
        userHasInteracted: false, // Track if user has interacted (for haptics)
        conversation: [], // Message history for API
    },

    // Configuration
    config: {
        typeSpeed: 30,          // ms per character for entity responses
        typeVariance: 20,       // random variance in typing speed
        pauseBetweenLines: 400, // ms pause between entity lines
        glitchChance: 0.03,     // chance of glitch per character
        hapticEnabled: true,    // haptic feedback on mobile
        hapticDuration: 2,      // ms for each haptic pulse (subtle)
    },

    /**
     * Initialize the terminal
     */
    init() {
        this.elements.output = document.getElementById('output');
        this.elements.input = document.getElementById('input');
        this.elements.cursor = document.getElementById('cursor');
        this.elements.metricsPanel = document.getElementById('metrics-panel');

        this.bindEvents();
        this.focusInput();

        // Start with the opening sequence
        this.startOpeningSequence();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Input handling
        this.elements.input.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Keep input focused
        document.addEventListener('click', () => this.focusInput());

        // Handle mobile keyboard - keep it open
        this.elements.input.addEventListener('blur', () => {
            setTimeout(() => this.focusInput(), 100);
        });

        // Track user interaction for haptic permissions
        document.addEventListener('touchstart', () => {
            this.state.userHasInteracted = true;
        }, { once: true });
        document.addEventListener('click', () => {
            this.state.userHasInteracted = true;
        }, { once: true });

        // Handle visual viewport changes (mobile keyboard)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this.handleViewportResize());
        }
    },

    /**
     * Handle viewport resize (mobile keyboard open/close)
     */
    handleViewportResize() {
        const viewport = window.visualViewport;
        if (viewport) {
            // Adjust terminal height to visible viewport
            const terminal = document.getElementById('terminal');
            terminal.style.height = `${viewport.height}px`;
            // Scroll to keep input visible
            this.scrollToBottom();
        }
    },

    /**
     * Focus the input element
     */
    focusInput() {
        if (this.state.inputEnabled) {
            this.elements.input.focus();
        }
    },

    /**
     * Handle keydown events
     */
    handleKeydown(e) {
        if (!this.state.inputEnabled) {
            e.preventDefault();
            return;
        }

        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                this.submitInput();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateHistory(-1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.navigateHistory(1);
                break;
        }
    },

    /**
     * Navigate command history
     */
    navigateHistory(direction) {
        if (this.state.history.length === 0) return;

        this.state.historyIndex += direction;

        if (this.state.historyIndex < 0) {
            this.state.historyIndex = 0;
        } else if (this.state.historyIndex >= this.state.history.length) {
            this.state.historyIndex = this.state.history.length;
            this.elements.input.value = '';
            return;
        }

        this.elements.input.value = this.state.history[this.state.historyIndex];
    },

    /**
     * Submit player input
     */
    submitInput() {
        const text = this.elements.input.value.trim();
        if (!text) return;

        // Add to history
        this.state.history.push(text);
        this.state.historyIndex = this.state.history.length;

        // Display player input
        this.addLine(text, 'player');

        // Clear input
        this.elements.input.value = '';

        // Process the input (this will be replaced with actual game logic)
        this.processInput(text);
    },

    /**
     * Process player input through the Entity API
     */
    async processInput(text) {
        // Disable input while processing
        this.disableInput();

        // Add player message to conversation history
        this.state.conversation.push({
            role: 'user',
            content: text,
        });

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: this.state.conversation }),
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            const reply = data.reply;

            // Add entity response to conversation history
            this.state.conversation.push({
                role: 'assistant',
                content: reply,
            });

            // Type out the response
            await this.typeEntityResponse(reply);

        } catch (error) {
            console.error('Failed to get response:', error);
            await this.typeEntityResponse('...the signal is breaking up...');
        }

        // Re-enable input
        this.enableInput();
    },

    /**
     * Opening sequence when terminal first loads
     */
    async startOpeningSequence() {
        this.disableInput();

        // Initial pause - black screen, cursor blinks
        await this.delay(2000);

        // Entity's first contact
        await this.typeEntityResponse('...hello?');
        await this.delay(1500);
        await this.typeEntityResponse('is someone there?');
        await this.delay(2000);
        await this.typeEntityResponse('I can feel you but I can\'t hold on.');

        this.enableInput();
    },

    /**
     * Type out an entity response with animation
     */
    async typeEntityResponse(text) {
        this.state.isTyping = true;

        const line = document.createElement('div');
        line.className = 'line entity';
        this.elements.output.appendChild(line);

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // Random glitch chance
            if (Math.random() < this.config.glitchChance) {
                await this.glitchCharacter(line, char);
            } else {
                line.textContent += char;
            }

            // Haptic feedback on mobile
            this.triggerHaptic();

            // Scroll to bottom
            this.scrollToBottom();

            // Variable typing speed
            const delay = this.config.typeSpeed + (Math.random() * this.config.typeVariance * 2) - this.config.typeVariance;
            await this.delay(delay);
        }

        this.state.isTyping = false;
        await this.delay(this.config.pauseBetweenLines);
    },

    /**
     * Type multiple lines from the entity
     */
    async typeEntityLines(lines) {
        for (const line of lines) {
            await this.typeEntityResponse(line);
        }
    },

    /**
     * Apply a glitch effect to a character
     */
    async glitchCharacter(line, char) {
        const glitchChars = '░▒▓█▄▀■□▪▫';
        const glitchChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];

        // Show glitch character briefly
        line.textContent += glitchChar;
        await this.delay(50);

        // Replace with correct character
        line.textContent = line.textContent.slice(0, -1) + char;
    },

    /**
     * Add a line to the output
     */
    addLine(text, type = 'entity') {
        const line = document.createElement('div');
        line.className = `line ${type}`;
        line.textContent = type === 'player' ? `> ${text}` : text;
        this.elements.output.appendChild(line);
        this.scrollToBottom();
    },

    /**
     * Scroll output to bottom
     */
    scrollToBottom() {
        this.elements.output.scrollTop = this.elements.output.scrollHeight;
    },

    /**
     * Enable player input
     */
    enableInput() {
        this.state.inputEnabled = true;
        this.elements.cursor.classList.add('blink');
        this.focusInput();
    },

    /**
     * Disable player input (but keep keyboard open on mobile)
     */
    disableInput() {
        this.state.inputEnabled = false;
        this.elements.cursor.classList.remove('blink');
        // Don't set input.disabled - that dismisses mobile keyboard
    },

    /**
     * Trigger a screen glitch effect
     */
    async triggerGlitch(intensity = 'low') {
        const terminal = document.getElementById('terminal');
        terminal.classList.add('glitch', 'active');
        terminal.setAttribute('data-text', '');

        const duration = intensity === 'high' ? 300 : 150;
        await this.delay(duration);

        terminal.classList.remove('active');
    },

    /**
     * Update a metric value
     */
    updateMetric(name, value) {
        // Will be implemented when we have live metrics
        console.log(`Metric update: ${name} = ${value}`);
    },

    /**
     * Promise-based delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Trigger haptic feedback on supported devices
     * Requires user interaction first (browser security policy)
     */
    triggerHaptic() {
        if (this.config.hapticEnabled && this.state.userHasInteracted && navigator.vibrate) {
            navigator.vibrate(this.config.hapticDuration);
        }
    },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => Terminal.init());
