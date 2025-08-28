/**
 * Track Renderer using p5.js
 * Follows exactly the original PyQt5 rendering behavior
 */

export class TrackRenderer {
    constructor() {
        this.p5Instance = null
        this.config = {
            size: { width: 600, height: 400 },
            start: { x: 100, y: 200, angle: 0 }
        }
        this.commands = []
        this.highlightLineNumber = null

        this.MARK_SIZE = 4
        this.MARK_OFFSET = 4
        this.RECT_MARGIN = 30
    }

    /**
     * Initialize p5.js instance
     * @param {HTMLElement} container - Container element for canvas
     */
    init(container) {
        return new Promise((resolve, reject) => {
            if (typeof p5 === 'undefined') {
                reject(new Error('p5.js is not available'))
                return
            }

            try {
                this.p5Instance = new p5((p) => {
                    p.setup = () => {
                        const canvasWidth = Math.min(1200, container.clientWidth - 40)
                        const canvasHeight = Math.min(900, container.clientHeight - 40)

                        p.createCanvas(canvasWidth, canvasHeight)
                        p.background('#161b22')
                        p.noLoop()

                        console.log('p5.js canvas created successfully')
                        resolve()
                    }

                }, container)
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * Render track with given configuration and commands
     * @param {Object} config - Track configuration
     * @param {Array} commands - Array of drawing commands
     */
    render(config, commands) {
        if (!this.p5Instance) return

        this.config = config
        this.commands = commands
        this.drawFrame(this.p5Instance)
    }

    /**
     * Set which line number to highlight
     * @param {number} lineNumber - Line number to highlight (1-based)
     */
    setHighlightLine(lineNumber) {
        this.highlightLineNumber = lineNumber
        if (this.p5Instance) {
            this.drawFrame(this.p5Instance)
        }
    }

    /**
     * Draw complete frame - follows original PyQt5 logic with @directives
     */
    drawFrame(p) {

        p.background('#161b22')

        p.stroke(255)
        p.strokeWeight(1.9)
        p.noFill()

        let x = this.config.start.x
        let y = this.config.start.y
        let theta = this.config.start.angle
        let firstStep = true
        let firstMark = true

        this.drawRect(p, this.config.size.width, this.config.size.height)

        for (const command of this.commands) {
            const cmd = command.command

            if (!firstStep) {
                this.drawMark(p, x, y, theta, false)
            }

            const isHighlighted = command.lineNumber === this.highlightLineNumber

            if (cmd === "straight" && command.args.length === 1) {
                const d = command.args[0]
                const result = this.drawLine(p, x, y, theta, d, isHighlighted)
                x = result.x
                y = result.y
                theta = result.theta
                firstStep = false
            }
            else if (cmd === "arc" && command.args.length === 3) {
                const side = command.args[0]
                const radius = command.args[1]
                const angle = command.args[2]
                const result = this.drawArc(p, x, y, theta, side, radius, angle, isHighlighted)
                x = result.x
                y = result.y
                theta = result.theta
                firstStep = false
            }
        }

        if (!firstStep) {
            this.drawMark(p, x, y, theta, true)
        }
    }

    /**
     * Draw mark - exactly like original draw_mark()
     * @param {Object} p - p5.js instance
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} theta - Angle in degrees
     * @param {boolean} invert - Invert mark direction
     */
    drawMark(p, x, y, theta, invert = false) {

        let dx0 = this.MARK_OFFSET * Math.cos(this.degToRad(theta + 90))
        let dy0 = this.MARK_OFFSET * Math.sin(this.degToRad(theta + 90))
        let dx1 = dx0 + this.MARK_SIZE * Math.cos(this.degToRad(theta + 90))
        let dy1 = dy0 + this.MARK_SIZE * Math.sin(this.degToRad(theta + 90))

        if (invert) {
            dx0 = -dx0; dx1 = -dx1; dy0 = -dy0; dy1 = -dy1
        }

        p.line(x + dx0, y - dy0, x + dx1, y - dy1)
    }

    /**
     * Draw line - exactly like original draw_line()
     * @param {Object} p - p5.js instance
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {number} theta - Angle in degrees
     * @param {number} d - Distance
     * @returns {Object} New position
     */
    drawLine(p, x, y, theta, d, isHighlighted = false) {
        const dx = d * Math.cos(this.degToRad(theta))
        const dy = -d * Math.sin(this.degToRad(theta))

        if (isHighlighted) {
            p.stroke('#58a6ff')
            p.strokeWeight(4)
        } else {
            p.stroke(255)
            p.strokeWeight(1.9)
        }

        p.line(x, y, x + dx, y + dy)

        return { x: x + dx, y: y + dy, theta: theta }
    }

    /**
     * Draw arc - exactly like original draw_arc()
     * @param {Object} p - p5.js instance
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {number} theta - Start angle in degrees
     * @param {string} side - 'l' or 'r'
     * @param {number} radius - Arc radius
     * @param {number} angle - Arc angle in degrees
     * @returns {Object} New position and angle
     */
    drawArc(p, x, y, theta, side, radius, angle, isHighlighted = false) {

        const centerTurn = side === 'l' ? -90 : 90
        let drawAngle = angle

        if (side !== 'l') {
            drawAngle = -angle
        }

        const cx = x + radius * Math.cos(this.degToRad(theta - centerTurn))
        const cy = y - radius * Math.sin(this.degToRad(theta - centerTurn))

        if (isHighlighted) {
            p.stroke('#58a6ff')
            p.strokeWeight(4)
        } else {
            p.stroke(255)
            p.strokeWeight(1.9)
        }

        const startAngle = this.degToRad(-(theta + centerTurn))
        const sweepAngle = this.degToRad(-drawAngle)

        if (side == 'l'){
            p.arc(cx, cy, 2 * radius, 2 * radius, startAngle + sweepAngle, startAngle)
        } else {
            p.arc(cx, cy, 2 * radius, 2 * radius, startAngle, startAngle + sweepAngle)
        }

        const newTheta = theta + drawAngle
        const newX = cx + radius * Math.cos(this.degToRad(newTheta + centerTurn))
        const newY = cy - radius * Math.sin(this.degToRad(newTheta + centerTurn))

        return { x: newX, y: newY, theta: newTheta }
    }

    /**
     * Draw boundary rectangle - exactly like original draw_rect()
     * @param {Object} p - p5.js instance
     * @param {number} largura - Width
     * @param {number} altura - Height
     */
    drawRect(p, largura, altura) {
        p.rect(0, 0, largura, altura)
    }

    /**
     * Convert degrees to radians - exactly like original
     * @param {number} angle - Angle in degrees
     * @returns {number} Angle in radians
     */
    degToRad(angle) {
        return Math.PI * angle / 180
    }

    /**
     * Get current canvas dimensions
     */
    getCanvasDimensions() {
        if (!this.p5Instance) return { width: 0, height: 0 }
        return {
            width: this.p5Instance.width,
            height: this.p5Instance.height
        }
    }

    /**
     * Resize canvas to fit container
     */
    resize(container) {
        if (!this.p5Instance) return

        const newWidth = Math.min(1200, container.clientWidth - 40)
        const newHeight = Math.min(900, container.clientHeight - 40)

        this.p5Instance.resizeCanvas(newWidth, newHeight)
        this.p5Instance.redraw()
    }
}
