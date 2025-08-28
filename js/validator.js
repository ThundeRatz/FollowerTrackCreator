/**
 * Track Validator
 * Validates LFDL commands against RoboCore official rules
 */

export class TrackValidator {
    constructor() {
        this.rules = {
            lineWidth: 19,
            minArcRadius: 100,
            minDistance: 200,
            maxLength: {
                pro: 60000,
                junior: 20000
            },
            intersectionAngle: 90,
            minBoundaryDistance: 200,
        }
    }

    /**
     * Validate parsed LFDL result
     * @param {Object} parsedResult - Result from LFDLParser.parse()
     * @returns {Object} Validation result with errors and warnings
     */
    validate(parsedResult) {
        const { config, commands } = parsedResult
        const errors = []
        const warnings = []

        for (let i = 0; i < commands.length; i++) {
            const command = commands[i]
            const commandErrors = this.validateCommand(command, i + 1)
            errors.push(...commandErrors)
        }

        const trackErrors = this.validateTrack(config, commands)
        errors.push(...trackErrors)

        const trackWarnings = this.generateWarnings(config, commands)
        warnings.push(...trackWarnings)

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            stats: this.calculateStats(config, commands)
        }
    }

    /**
     * Validate individual command (only drawing commands, config via @directives)
     * @param {Object} command - Single LFDL command
     * @param {number} lineNumber - Line number for error reporting
     * @returns {Array} Array of error messages
     */
    validateCommand(command, lineNumber) {
        const errors = []

        switch (command.command) {
            case 'straight':
                const distance = command.args[0]
                if (distance <= 0) {
                    errors.push(`Linha ${lineNumber}: Distância deve ser positiva (${distance})`)
                }
                if (distance > 5000) {
                    errors.push(`Linha ${lineNumber}: Distância muito longa (${distance}mm)`)
                }
                break

            case 'arc':
                const [side, radius, angle] = command.args
                if (Math.abs(radius) < this.rules.minArcRadius) {
                    errors.push(`Linha ${lineNumber}: Raio mínimo ${this.rules.minArcRadius}mm (atual: ${radius}mm)`)
                }
                if (Math.abs(angle) > 360) {
                    errors.push(`Linha ${lineNumber}: Ângulo não pode exceder 360° (atual: ${angle}°)`)
                }
                if (angle === 0) {
                    errors.push(`Linha ${lineNumber}: Ângulo não pode ser zero`)
                }
                if (side !== 'l' && side !== 'r') {
                    errors.push(`Linha ${lineNumber}: Direção deve ser 'l' (left) ou 'r' (right)`)
                }
                break
        }

        return errors
    }

    /**
     * Validate overall track properties
     * @param {Object} config - Track configuration
     * @param {Array} commands - All track commands
     * @returns {Array} Array of error messages
     */
    validateTrack(config, commands) {
        const errors = []

        if (config.size.width <= 0 || config.size.height <= 0) {
            errors.push('Dimensões do canvas devem ser positivas')
        }

        if (config.start.x < 0 || config.start.x > config.size.width ||
            config.start.y < 0 || config.start.y > config.size.height) {
            errors.push('Posição inicial deve estar dentro do canvas')
        }

        const totalLength = this.calculateTotalLength(commands)

        if (totalLength > this.rules.maxLength.junior) {
            errors.push(`Pista muito longa para categoria Junior (${Math.round(totalLength)}mm > ${this.rules.maxLength.junior}mm)`)
        }

        if (totalLength > this.rules.maxLength.pro) {
            errors.push(`Pista muito longa para categoria Pro (${Math.round(totalLength)}mm > ${this.rules.maxLength.pro}mm)`)
        }

        return errors
    }

    /**
     * Generate warnings for best practices
     * @param {Object} config - Track configuration
     * @param {Array} commands - All track commands
     * @returns {Array} Array of warning messages
     */
    generateWarnings(config, commands) {
        const warnings = []

        commands.forEach((command, index) => {
            if (command.command === 'arc') {
                const radius = Math.abs(command.args[1])
                if (radius < 150 && radius >= this.rules.minArcRadius) {
                    warnings.push(`Linha ${index + 1}: Raio pequeno pode dificultar seguimento (${radius}mm)`)
                }
            }
        })

        commands.forEach((command, index) => {
            if (command.command === 'straight') {
                const distance = command.args[0]
                if (distance > 1000) {
                    warnings.push(`Linha ${index + 1}: Reta muito longa pode ser monótona (${distance}mm)`)
                }
            }
        })

        if (commands.length < 4) {
            warnings.push('Pista muito simples - considere adicionar mais elementos')
        }

        const arcCount = commands.filter(cmd => cmd.command === 'arc').length
        const straightCount = commands.filter(cmd => cmd.command === 'straight').length

        if (arcCount === 0) {
            warnings.push('Pista sem curvas pode ser muito fácil')
        }

        if (straightCount === 0) {
            warnings.push('Pista sem retas pode ser muito difícil')
        }

        return warnings
    }

    /**
     * Calculate total track length (English DSL, PyQt5 drawing logic)
     * @param {Array} commands - All track commands
     * @returns {number} Total length in millimeters
     */
    calculateTotalLength(commands) {
        let totalLength = 0

        for (const command of commands) {
            switch (command.command) {
                case 'straight':
                    totalLength += command.args[0]
                    break
                case 'arc':
                    const [side, radius, angle] = command.args
                    const arcLength = Math.abs(radius * angle * Math.PI / 180)
                    totalLength += arcLength
                    break
            }
        }

        return totalLength
    }

    /**
     * Calculate track statistics (English DSL, PyQt5 drawing logic)
     * @param {Object} config - Track configuration
     * @param {Array} commands - All track commands
     * @returns {Object} Track statistics
     */
    calculateStats(config, commands) {
        const straightCommands = commands.filter(cmd => cmd.command === 'straight')
        const arcCommands = commands.filter(cmd => cmd.command === 'arc')

        const totalLength = this.calculateTotalLength(commands)
        const straightLength = straightCommands.reduce((sum, cmd) => sum + cmd.args[0], 0)
        const arcLength = totalLength - straightLength

        return {
            totalCommands: commands.length,
            straightSegments: straightCommands.length,
            arcSegments: arcCommands.length,
            totalLength: Math.round(totalLength),
            straightLength: Math.round(straightLength),
            arcLength: Math.round(arcLength),
            category: {
                junior: totalLength <= this.rules.maxLength.junior,
                pro: totalLength <= this.rules.maxLength.pro
            }
        }
    }

    /**
     * Get validation rules for reference
     * @returns {Object} Current validation rules
     */
    getRules() {
        return { ...this.rules }
    }
}
