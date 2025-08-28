/**
 * Monaco Editor Manager
 * Handles Monaco editor initialization and events
 */

export class EditorManager {
    constructor() {
        this.editor = null
        this.isInitialized = false
        this.changeCallback = null
    }

    /**
     * Initialize Monaco editor with LFDL language support
     * @param {HTMLElement} container - Container element for editor
     * @param {string} initialValue - Initial code value
     * @returns {Promise} Promise that resolves when editor is ready
     */
    async init(container, initialValue = '') {
        return new Promise((resolve, reject) => {

            if (typeof monaco !== 'undefined') {
                console.log('Monaco already loaded, creating editor...')
                this.createEditor(container, initialValue)
                this.isInitialized = true
                resolve(this.editor)
                return
            }

            if (typeof require === 'undefined' || !require.defined || !require.defined('vs/editor/editor.main')) {
                require.config({
                    paths: {
                        'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
                    }
                });
            }

            require(['vs/editor/editor.main'], () => {
                try {
                    console.log('Monaco editor loaded, creating editor...')
                    this.createEditor(container, initialValue)
                    this.isInitialized = true
                    resolve(this.editor)
                } catch (error) {
                    console.error('Error creating Monaco editor:', error)
                    reject(error)
                }
            }, (error) => {
                console.error('Error loading Monaco editor:', error)
                reject(new Error('Failed to load Monaco editor: ' + error))
            })
        })
    }

    /**
     * Create Monaco editor instance
     * @param {HTMLElement} container - Container element
     * @param {string} initialValue - Initial code value
     */
    createEditor(container, initialValue) {

        this.setupLFDLLanguage()

        console.log('LFDL language configured, creating editor...')

        this.editor = monaco.editor.create(container, {
            value: initialValue,
            language: 'lfdl',
            theme: 'lfdl-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            folding: false,
            glyphMargin: false,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'line',
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: 'line',
            scrollbar: {
                vertical: 'auto',
                horizontal: 'auto'
            }
        });

        console.log('Monaco editor created successfully!')

        this.editor.onDidChangeModelContent(() => {
            if (this.changeCallback) {
                this.changeCallback(this.getValue())
            }
        })

        this.editor.onDidChangeCursorPosition((e) => {
            if (this.cursorChangeCallback) {
                this.cursorChangeCallback(e.position.lineNumber)
            }
        })
    }

    /**
     * Set change callback function
     * @param {Function} callback - Callback function to call on content change
     */
    onChange(callback) {
        this.changeCallback = callback
    }

    /**
     * Set cursor position change callback function
     * @param {Function} callback - Callback function to call on cursor change
     */
    onCursorChange(callback) {
        this.cursorChangeCallback = callback
    }

    /**
     * Get current editor value
     * @returns {string} Current editor content
     */
    getValue() {
        if (!this.editor) return ''
        return this.editor.getValue()
    }

    /**
     * Set editor value
     * @param {string} value - New content for editor
     */
    setValue(value) {
        if (!this.editor) return
        this.editor.setValue(value)
    }

    /**
     * Clear editor content
     */
    clear() {
        if (!this.editor) return
        this.editor.setValue('')
    }

    /**
     * Focus the editor
     */
    focus() {
        if (!this.editor) return
        this.editor.focus()
    }

    /**
     * Set up LFDL language support with full syntax highlighting
     */
    setupLFDLLanguage() {
        if (!monaco) return

        monaco.languages.register({ id: 'lfdl' })

        monaco.languages.setMonarchTokensProvider('lfdl', {

            keywords: [
                'straight', 'arc'
            ],
            directives: [
                'start', 'size'
            ],
            operators: [
                'l', 'r'
            ],

            // Tokenizer rules
            tokenizer: {
                root: [
                    // Comments
                    [/#.*$/, 'comment'],

                    // Directives (@start, @size)
                    [/@\w+/, 'directive'],

                    // Keywords (straight, arc)
                    [/\b(straight|arc)\b/, 'keyword'],

                    // Direction operators (l, r)
                    [/\b(l|r)\b/, 'operator'],

                    // Numbers (integers and floats)
                    [/-?\d+\.?\d*/, 'number'],

                    // Whitespace
                    [/\s+/, 'white'],

                    // Everything else
                    [/.*/, 'text']
                ]
            }
        })

        monaco.languages.registerCompletionItemProvider('lfdl', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position)
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                }

                return {
                    suggestions: [
                        // Directives
                        {
                            label: '@start',
                            kind: monaco.languages.CompletionItemKind.Keyword,
                            insertText: '@start ${1:250} ${2:100} ${3:0}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Set starting position and angle: @start <x> <y> <angle>',
                            range: range
                        },
                        {
                            label: '@size',
                            kind: monaco.languages.CompletionItemKind.Keyword,
                            insertText: '@size ${1:600} ${2:400}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Set canvas size: @size <width> <height>',
                            range: range
                        },
                        // Commands
                        {
                            label: 'straight',
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'straight ${1:100}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Draw straight line: straight <distance>',
                            range: range
                        },
                        {
                            label: 'arc',
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'arc ${1|l,r|} ${2:100} ${3:90}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Draw arc: arc <l|r> <radius> <angle>',
                            range: range
                        }
                    ]
                }
            }
        })

        monaco.editor.defineTheme('lfdl-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [

                { token: 'directive', foreground: '#569CD6', fontStyle: 'bold' },
                { token: 'keyword', foreground: '#DCDCAA', fontStyle: 'bold' },
                { token: 'operator', foreground: '#D7BA7D' },
                { token: 'number', foreground: '#B5CEA8' },
                { token: 'comment', foreground: '#6A9955', fontStyle: 'italic' },
                { token: 'text', foreground: '#D4D4D4' }
            ],
            colors: {
                'editor.background': '#1E1E1E',
                'editor.foreground': '#D4D4D4',
                'editor.lineHighlightBackground': '#2D2D30',
                'editor.selectionBackground': '#264F78',
                'editor.inactiveSelectionBackground': '#3A3D41'
            }
        })
    }

    /**
     * Get editor statistics
     * @returns {Object} Editor statistics
     */
    getStats() {
        if (!this.editor) return { lines: 0, characters: 0 }

        const model = this.editor.getModel()
        return {
            lines: model.getLineCount(),
            characters: model.getValueLength()
        }
    }

    /**
     * Insert text at current cursor position
     * @param {string} text - Text to insert
     */
    insertText(text) {
        if (!this.editor) return

        const position = this.editor.getPosition()
        const range = new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
        )

        this.editor.executeEdits('insert-text', [{
            range: range,
            text: text
        }])
    }

    /**
     * Dispose of the editor instance
     */
    dispose() {
        if (this.editor) {
            this.editor.dispose()
            this.editor = null
            this.isInitialized = false
        }
    }

    /**
     * Check if editor is ready
     * @returns {boolean} True if editor is initialized
     */
    isReady() {
        return this.isInitialized && this.editor !== null
    }
}
