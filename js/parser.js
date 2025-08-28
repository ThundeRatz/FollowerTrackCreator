/**
 * LFDL Parser - Line Follower Description Language
 * Parses text commands into structured data for track rendering
 */

export class LFDLParser {
    constructor() {
        this.defaultConfig = {
            size: { width: 600, height: 400 },
            start: { x: 100, y: 200, angle: 0 }
        }
    }

    /**
     * Parse LFDL code into commands array (with @directives)
     * @param {string} code - LFDL source code
     * @returns {Object} Parsed result with config and commands
     */
    parse(code) {
        const lines = code.split('\n')
        const commands = []
        let config = { ...this.defaultConfig }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim()

            if (!line || line.startsWith('#')) {
                continue
            }

            try {
                const parsed = this.parseLine(line)

                if (parsed.type === 'directive') {
                    this.applyDirective(config, parsed)
                } else {
                    commands.push(parsed)
                }

            } catch (error) {
                console.warn(`Linha ${i + 1} ignorada: "${line}" - ${error.message}`)
            }
        }

        return {
            config,
            commands,
            isValid: commands.length > 0
        }
    }

    /**
     * Parse a single line into directive or command
     * @param {string} line - Single line of LFDL code
     * @returns {Object} Parsed line object
     */
    parseLine(line) {
        const parts = line.split(/\s+/).filter(p => p.length > 0)

        if (parts.length === 0) {
            throw new Error('Linha vazia')
        }

        const cmd = parts[0].toLowerCase()

        if (cmd.startsWith('@')) {
            return this.parseDirective(cmd.substring(1), parts.slice(1))
        }

        return this.parseCommand(cmd, parts.slice(1))
    }

    /**
     * Parse directive commands (@size, @start)
     * @param {string} directive - Directive name
     * @param {string[]} args - Arguments array
     * @returns {Object} Directive object
     */
    parseDirective(directive, args) {
        switch (directive) {
            case 'size':
                if (args.length !== 2) {
                    throw new Error('@size requer 2 argumentos: @size <width> <height>')
                }
                return {
                    type: 'directive',
                    directive: 'size',
                    args: args.map(arg => parseFloat(arg))
                }

            case 'start':
                if (args.length !== 3) {
                    throw new Error('@start requer 3 argumentos: @start <x> <y> <angle>')
                }
                return {
                    type: 'directive',
                    directive: 'start',
                    args: args.map(arg => parseFloat(arg))
                }

            default:
                throw new Error(`Diretiva desconhecida: @${directive}`)
        }
    }

    /**
     * Parse drawing commands (only track drawing, config via @directives)
     * @param {string} command - Command name
     * @param {string[]} args - Arguments array
     * @returns {Object} Command object
     */
    parseCommand(command, args) {
        switch (command) {
            case 'straight':
                if (args.length !== 1) {
                    throw new Error('straight requer 1 argumento: straight <distance>')
                }
                return {
                    type: 'command',
                    command: 'straight',
                    args: [parseFloat(args[0])]
                }

            case 'arc':
                if (args.length !== 3) {
                    throw new Error('arc requer 3 argumentos: arc <l|r> <radius> <angle>')
                }
                const side = args[0].toLowerCase()
                if (side !== 'l' && side !== 'r') {
                    throw new Error('arc: direção deve ser "l" (left) ou "r" (right)')
                }
                return {
                    type: 'command',
                    command: 'arc',
                    args: [side, parseFloat(args[1]), parseFloat(args[2])]
                }

            default:
                throw new Error(`Comando desconhecido: ${command}`)
        }
    }

    /**
     * Apply directive to configuration
     * @param {Object} config - Configuration object to modify
     * @param {Object} directive - Directive to apply
     */
    applyDirective(config, directive) {
        switch (directive.directive) {
            case 'size':
                config.size.width = directive.args[0]
                config.size.height = directive.args[1]
                break

            case 'start':
                config.start.x = directive.args[0]
                config.start.y = directive.args[1]
                config.start.angle = directive.args[2]
                break
        }
    }

    /**
     * Generate example LFDL code (with @directives)
     * @returns {string} Example code
     */
    getExampleCode() {
        return `# FollowerTrackCreator LFDL Example
@start 250 100 0
@size 600 400

# Track drawing commands
straight 100
straight 100
arc r 100 180
straight 300
arc r 100 180
straight 100`
    }
}
