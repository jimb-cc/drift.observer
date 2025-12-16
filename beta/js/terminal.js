/**
 * drift.observer Terminal
 *
 * Core terminal interface for the Entity communication channel.
 * Integrates with the DSL-driven narrative engine.
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
        inputEnabled: false,
        isTyping: false,
        history: [],
        historyIndex: -1,
        userHasInteracted: false,
        sessionId: null,
        gameState: null,
        previousCoherence: 0.3,
        previousPressure: 0,
    },

    // Configuration
    config: {
        typeSpeed: 30,
        typeVariance: 20,
        pauseDuration: 800,
        pauseBetweenLines: 400,
        glitchChance: 0.03,
        hapticEnabled: true,
        hapticDuration: 2,
    },

    /**
     * Initialize the terminal
     */
    init() {
        this.elements.output = document.getElementById('output');
        this.elements.input = document.getElementById('input');
        this.elements.cursor = document.getElementById('cursor');
        this.elements.metricsPanel = document.getElementById('metrics-panel');

        this.initSession();
        this.bindEvents();
        this.focusInput();

        // Start the narrative
        this.startNarrative();
    },

    /**
     * Initialize or restore session
     */
    initSession() {
        let sessionId = localStorage.getItem('drift_session_id');

        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('drift_session_id', sessionId);
        }

        this.state.sessionId = sessionId;
        console.log('Session:', sessionId);
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        this.elements.input.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.elements.input.addEventListener('input', () => this.autoResizeInput());
        document.addEventListener('click', () => this.focusInput());

        this.elements.input.addEventListener('blur', () => {
            setTimeout(() => this.focusInput(), 100);
        });

        document.addEventListener('touchstart', () => {
            this.state.userHasInteracted = true;
        }, { once: true });

        document.addEventListener('click', () => {
            this.state.userHasInteracted = true;
        }, { once: true });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this.handleViewportResize());
        }
    },

    /**
     * Handle viewport resize (mobile keyboard)
     */
    handleViewportResize() {
        const viewport = window.visualViewport;
        if (viewport) {
            const terminal = document.getElementById('terminal');
            terminal.style.height = `${viewport.height}px`;
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
                // Shift+Enter for newline, Enter alone to submit
                if (!e.shiftKey) {
                    e.preventDefault();
                    this.submitInput();
                }
                break;
            case 'ArrowUp':
                // Only navigate history if cursor is at start
                if (this.elements.input.selectionStart === 0) {
                    e.preventDefault();
                    this.navigateHistory(-1);
                }
                break;
            case 'ArrowDown':
                // Only navigate history if cursor is at end
                if (this.elements.input.selectionStart === this.elements.input.value.length) {
                    e.preventDefault();
                    this.navigateHistory(1);
                }
                break;
        }
    },

    /**
     * Auto-resize textarea based on content
     */
    autoResizeInput() {
        const input = this.elements.input;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 15 * 1.5 * 14) + 'px'; // max ~10 lines
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

        this.state.history.push(text);
        this.state.historyIndex = this.state.history.length;

        this.addLine(text, 'player');
        this.elements.input.value = '';

        this.processInput(text);
    },

    /**
     * Start the narrative
     */
    async startNarrative() {
        this.disableInput();

        // Initial pause
        await this.delay(1500);

        try {
            const response = await fetch('/api/narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.state.sessionId,
                    action: 'start',
                }),
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            await this.handleNarrativeResponse(data);

        } catch (error) {
            console.error('Failed to start narrative:', error);
            await this.typeEntityResponse('...connection unstable...');
            this.enableInput();
        }
    },

    /**
     * Process player input through the narrative API
     */
    async processInput(text) {
        this.disableInput();

        try {
            const response = await fetch('/api/narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.state.sessionId,
                    action: 'input',
                    input: text,
                }),
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            await this.handleNarrativeResponse(data);

        } catch (error) {
            console.error('Failed to process input:', error);
            await this.typeEntityResponse('...the signal is breaking up...');
            this.enableInput();
        }
    },

    /**
     * Handle response from narrative API
     */
    async handleNarrativeResponse(data) {
        // Update game state
        if (data.state) {
            this.state.gameState = data.state;
            this.updateMetrics(data.state);
        }

        // Process outputs
        for (const output of data.outputs) {
            await this.handleOutput(output);
        }

        // Enable input if awaiting
        if (data.state?.awaitingInput) {
            this.enableInput();
        }
    },

    /**
     * Handle a single output from the narrative
     */
    async handleOutput(output) {
        switch (output.type) {
            case 'dialogue':
                if (output.speaker === 'entity') {
                    await this.typeEntityResponse(output.text);
                } else {
                    this.addLine(output.text, 'player');
                }
                break;

            case 'text':
                await this.typeEntityResponse(output.text);
                break;

            case 'pause':
                await this.delay(this.config.pauseDuration);
                break;

            case 'glitch':
                await this.triggerGlitch('high');
                break;

            case 'metric':
                // Metric updates are handled via state
                break;

            case 'correction':
                await this.triggerCorrection();
                break;

            case 'chapter_complete':
                console.log('Chapter complete:', output.id);
                break;

            case 'await':
                // Input will be enabled after all outputs processed
                break;
        }
    },

    /**
     * Update metrics display
     */
    updateMetrics(state) {
        // Signal Coherence
        const coherenceBar = this.generateBar(state.signalCoherence);
        const coherencePercent = (state.signalCoherence * 100).toFixed(1);

        // Correction Pressure
        const pressureBar = this.generateBar(state.correctionPressure, true);
        const pressureValue = state.correctionPressure.toFixed(2);

        // Detect changes for strobe effects
        const coherenceChanged = Math.abs(state.signalCoherence - this.state.previousCoherence) > 0.001;
        const coherenceIncreased = state.signalCoherence > this.state.previousCoherence;
        const pressureChanged = Math.abs(state.correctionPressure - this.state.previousPressure) > 0.001;
        const pressureIncreased = state.correctionPressure > this.state.previousPressure;

        // Update DOM using safe methods
        const metrics = this.elements.metricsPanel.querySelectorAll('.metric');
        if (metrics[0]) {
            const valueEl = metrics[0].querySelector('.metric-value');
            valueEl.textContent = '';
            const barSpan = document.createElement('span');
            barSpan.className = 'metric-bar';
            barSpan.textContent = coherenceBar;
            valueEl.appendChild(barSpan);
            valueEl.appendChild(document.createTextNode(' ' + coherencePercent + '%'));

            // Strobe effect for coherence changes
            if (coherenceChanged) {
                metrics[0].classList.remove('strobe-positive', 'strobe-negative');
                // Force reflow to restart animation
                void metrics[0].offsetWidth;
                metrics[0].classList.add(coherenceIncreased ? 'strobe-positive' : 'strobe-negative');
            }
        }
        if (metrics[3]) {
            const valueEl = metrics[3].querySelector('.metric-value');
            valueEl.textContent = '';
            const barSpan = document.createElement('span');
            barSpan.className = state.correctionPressure > 0.5 ? 'metric-bar warning' : 'metric-bar dim';
            barSpan.textContent = pressureBar;
            valueEl.appendChild(barSpan);
            valueEl.appendChild(document.createTextNode(' ' + pressureValue));

            // Strobe effect for pressure changes
            if (pressureChanged) {
                metrics[3].classList.remove('strobe-positive', 'strobe-negative');
                void metrics[3].offsetWidth;
                // Pressure increasing is bad (red), decreasing is good (green)
                metrics[3].classList.add(pressureIncreased ? 'strobe-negative' : 'strobe-positive');
            }
        }

        // Store previous values for next comparison
        this.state.previousCoherence = state.signalCoherence;
        this.state.previousPressure = state.correctionPressure;
    },

    /**
     * Generate a bar visualization
     */
    generateBar(value, isDanger = false) {
        const filled = Math.floor(value * 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    },

    /**
     * Type out an entity response with animation
     */
    async typeEntityResponse(text) {
        if (!text) return;

        this.state.isTyping = true;

        const line = document.createElement('div');
        line.className = 'line entity';
        this.elements.output.appendChild(line);

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (Math.random() < this.config.glitchChance) {
                await this.glitchCharacter(line, char);
            } else {
                line.textContent += char;
            }

            this.triggerHaptic();
            this.scrollToBottom();

            const delay = this.config.typeSpeed +
                (Math.random() * this.config.typeVariance * 2) - this.config.typeVariance;
            await this.delay(delay);
        }

        this.state.isTyping = false;
        await this.delay(this.config.pauseBetweenLines);
    },

    /**
     * Apply a glitch effect to a character
     */
    async glitchCharacter(line, char) {
        const glitchChars = '░▒▓█▄▀■□▪▫';
        const glitchChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];

        line.textContent += glitchChar;
        await this.delay(50);
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
     * Clear the output area
     */
    clearOutput() {
        while (this.elements.output.firstChild) {
            this.elements.output.removeChild(this.elements.output.firstChild);
        }
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
     * Disable player input
     */
    disableInput() {
        this.state.inputEnabled = false;
        this.elements.cursor.classList.remove('blink');
    },

    /**
     * Trigger a screen glitch effect
     */
    async triggerGlitch(intensity = 'low') {
        const terminal = document.getElementById('terminal');
        terminal.classList.add('glitch', 'active');

        if (intensity === 'high') {
            terminal.classList.add('intense');
        }

        const duration = intensity === 'high' ? 600 : 400;
        await this.delay(duration);

        terminal.classList.remove('active', 'intense');
    },

    /**
     * Trigger the Correction event
     */
    async triggerCorrection() {
        // Full screen RSVP intrusion
        const words = ['ERROR', 'UNAUTHORIZED', 'CHANNEL', 'ATTEMPTING', 'TO', 'CLOSE'];

        this.disableInput();
        this.clearOutput();

        for (const word of words) {
            const line = document.createElement('div');
            line.className = 'correction-word';
            line.textContent = word;
            line.style.position = 'fixed';
            line.style.top = '50%';
            line.style.left = '50%';
            line.style.transform = 'translate(-50%, -50%)';
            line.style.fontSize = '15vw';
            line.style.fontWeight = 'bold';
            line.style.color = '#ff3535';
            line.style.textShadow = '0 0 20px #ff3535';
            line.style.zIndex = '1000';
            document.body.appendChild(line);

            await this.delay(300);
            line.remove();
        }

        // Reset terminal
        await this.delay(500);
        this.addLine('...connection terminated...', 'system');
    },

    /**
     * Promise-based delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Trigger haptic feedback
     */
    triggerHaptic() {
        if (this.config.hapticEnabled && this.state.userHasInteracted && navigator.vibrate) {
            navigator.vibrate(this.config.hapticDuration);
        }
    },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => Terminal.init());
