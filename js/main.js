/**
 * FollowerTrackCreator Web Application - Simplified Version
 */

import { LFDLParser } from './parser.js'
import { TrackRenderer } from './renderer.js'
import { TrackValidator } from './validator.js'
import { EditorManager } from './editor.js'

class FollowerTrackApp {
    constructor() {
        console.log('Starting FollowerTrackCreator...')

        this.parser = new LFDLParser()
        this.renderer = new TrackRenderer()
        this.validator = new TrackValidator()
        this.editorManager = new EditorManager()

        this.debounceTimer = null

        this.init()
    }

    async init() {
        try {

            await this.waitForDOM()

            this.setupElements()

            await this.waitForP5()

            await this.setupEditor()
            await this.setupRenderer()
            this.setupEventListeners()

            this.loadExample()
            this.updateZoomIndicator()

            console.log('FollowerTrackCreator initialized!')

        } catch (error) {
            console.error('Initialization failed:', error)
            this.showError('Falha ao inicializar: ' + error.message)
        }
    }

    waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve)
            } else {
                resolve()
            }
        })
    }

    waitForP5() {
        return new Promise(resolve => {
            let attempts = 0
            const check = () => {
                if (typeof p5 !== 'undefined') {
                    console.log('p5.js loaded successfully')
                    resolve()
                } else if (attempts++ < 100) {
                    setTimeout(check, 50)
                } else {
                    console.error('p5.js failed to load after 5 seconds')
                    resolve()
                }
            }
            check()
        })
    }

    setupElements() {
        this.elements = {
            editorContainer: document.getElementById('editor-container'),
            canvas: document.getElementById('canvas-container'),
            info: document.getElementById('track-info'),
            btnExample: document.getElementById('btn-example'),
            btnClear: document.getElementById('btn-clear'),
            btnZoomIn: document.getElementById('btn-zoom-in'),
            btnZoomOut: document.getElementById('btn-zoom-out'),
            btnZoomReset: document.getElementById('btn-zoom-reset'),
            zoomIndicator: document.getElementById('zoom-indicator')
        }

        for (const [name, el] of Object.entries(this.elements)) {
            if (!el) throw new Error(`Element not found: ${name}`)
        }
    }

    async setupEditor() {
        try {

            await this.editorManager.init(this.elements.editorContainer, this.parser.getExampleCode())

            this.editorManager.onChange((value) => {
                this.debouncedUpdate()
            })

            this.editorManager.onCursorChange((lineNumber) => {
                this.highlightLine(lineNumber)
            })

            console.log('Monaco Editor ready')
        } catch (error) {
            console.error('Failed to initialize Monaco Editor:', error)

            this.setupTextareaFallback()
        }
    }

    setupTextareaFallback() {
        const textarea = document.createElement('textarea')
        textarea.id = 'code-editor-fallback'
        textarea.value = this.parser.getExampleCode()
        textarea.style.width = '100%'
        textarea.style.height = '100%'
        textarea.style.resize = 'none'
        textarea.style.border = 'none'
        textarea.style.outline = 'none'
        textarea.style.backgroundColor = '#1e1e1e'
        textarea.style.color = '#ffffff'
        textarea.style.fontFamily = 'monospace'
        textarea.style.fontSize = '14px'
        textarea.style.padding = '10px'

        this.elements.editorContainer.appendChild(textarea)

        textarea.addEventListener('input', () => {
            this.debouncedUpdate()
        })

        this.editorManager = {
            getValue: () => textarea.value,
            setValue: (value) => { textarea.value = value },
            isReady: () => true,
            onCursorChange: () => {}
        }

        console.log('Textarea fallback ready')
    }

    async setupRenderer() {
        if (typeof p5 === 'undefined') {
            this.elements.canvas.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888;">
                    Canvas indisponível - p5.js não carregado
                </div>`
            return
        }

        try {
            await this.renderer.init(this.elements.canvas)

            this.renderer.onZoomChange(() => {
                this.updateZoomIndicator()
            })

            console.log('Renderer ready')
        } catch (error) {
            console.error('Renderer failed:', error)
            this.elements.canvas.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #f85149;">
                    Erro no canvas: ${error.message}
                </div>`
        }
    }

    setupEventListeners() {
        this.elements.btnExample.addEventListener('click', () => {
            this.loadExample()
        })

        this.elements.btnClear.addEventListener('click', () => {
            if (confirm('Limpar conteúdo do editor?')) {
                this.editorManager.setValue('')
                this.elements.info.textContent = 'Editor limpo'
            }
        })

        this.elements.btnZoomIn.addEventListener('click', () => {
            this.renderer.zoomIn()
            this.updateZoomIndicator()
        })

        this.elements.btnZoomOut.addEventListener('click', () => {
            this.renderer.zoomOut()
            this.updateZoomIndicator()
        })

        this.elements.btnZoomReset.addEventListener('click', () => {
            this.renderer.resetZoom()
            this.updateZoomIndicator()
        })
    }

    debouncedUpdate() {
        clearTimeout(this.debounceTimer)
        this.debounceTimer = setTimeout(() => {
            this.updateTrack()
        }, 300)
    }

    updateTrack() {
        try {
            console.log('=== UPDATE TRACK START ===')

            const code = this.editorManager.getValue()
            console.log('Code to parse:', code.substring(0, 100) + '...')

            const parseResult = this.parser.parse(code)
            console.log('Parse result:', parseResult)

            const validation = this.validator.validate(parseResult)
            console.log('Validation result:', validation)

            this.updateInfo(validation)

            console.log('Checking render conditions:')
            console.log('- parseResult.isValid:', parseResult.isValid)
            console.log('- renderer.p5Instance exists:', !!this.renderer.p5Instance)

            if (parseResult.isValid && this.renderer.p5Instance) {
                console.log('Calling renderer.render()...')
                this.renderer.render(parseResult.config, parseResult.commands)
            } else {
                console.log('Skipping render - conditions not met')
                if (!parseResult.isValid) {
                    console.log('Parse errors:', parseResult)
                }
                if (!this.renderer.p5Instance) {
                    console.log('No p5 instance available')
                }
            }

            console.log('=== UPDATE TRACK END ===')

        } catch (error) {
            console.error('Update failed:', error)
            this.elements.info.textContent = 'Erro: ' + error.message
        }
    }

    updateInfo(validation) {
        let text = 'Pronto para desenhar'

        if (validation.isValid && validation.stats) {
            const s = validation.stats
            text = `${s.totalCommands} comandos | ${s.totalLength}mm`

            if (s.category?.junior) text += ' | ✓ Júnior'
            if (s.category?.pro) text += ' | ✓ Pro'
        } else if (validation.errors?.length > 0) {
            text = `${validation.errors.length} erro(s)`
            console.warn('Validation errors:', validation.errors)
        }

        this.elements.info.textContent = text
    }

    loadExample() {
        const example = this.parser.getExampleCode()
        this.editorManager.setValue(example)
        this.updateTrack()
    }

    showError(message) {
        console.error(message)
        this.elements.info.textContent = 'Erro: ' + message
    }

    /**
     * Update zoom indicator with current zoom level
     */
    updateZoomIndicator() {
        const zoomPercentage = this.renderer.getZoomPercentage()
        this.elements.zoomIndicator.textContent = `${zoomPercentage}%`
    }

    /**
     * Highlight line in canvas based on cursor position
     * @param {number} lineNumber - Current cursor line (1-based)
     */
    highlightLine(lineNumber) {
        if (this.renderer && this.renderer.p5Instance) {
            this.renderer.setHighlightLine(lineNumber)
        }
    }
}

window.followerTrackApp = new FollowerTrackApp()
