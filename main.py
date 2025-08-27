from PyQt5.QtWidgets import QApplication, QWidget, QHBoxLayout, QVBoxLayout, \
    QPlainTextEdit, QPushButton, QGraphicsView, QGraphicsScene, QDesktopWidget, QFrame, QLabel
from PyQt5.QtGui import QPen, QPainter, QPainterPath, QBrush, QFont
from PyQt5.QtCore import Qt, pyqtSignal
import math, sys
from typing import Tuple


class LineNumberArea(QFrame):
    def __init__(self, editor):
        super().__init__(editor)
        self.editor = editor
        self.setStyleSheet("background: #222; color: #ccc; font-size: 16px;")
        self.setFixedWidth(40)

    def paintEvent(self, event):
        painter = QPainter(self)
        block = self.editor.firstVisibleBlock()
        blockNumber = block.blockNumber()
        top = int(self.editor.blockBoundingGeometry(block).translated(self.editor.contentOffset()).top())
        bottom = top + int(self.editor.blockBoundingRect(block).height())
        while block.isValid() and top <= event.rect().bottom():
            if block.isVisible() and bottom >= event.rect().top():
                number = str(blockNumber + 1)
                painter.setPen(Qt.lightGray)
                painter.drawText(0, top, self.width()-5, self.editor.fontMetrics().height(), Qt.AlignRight, number)
            block = block.next()
            top = bottom
            bottom = top + int(self.editor.blockBoundingRect(block).height())
            blockNumber += 1

class CommandEditor(QPlainTextEdit):
    submitted = pyqtSignal()

    def __init__(self):
        super().__init__()
        self.lineNumberArea = LineNumberArea(self)
        self.textChanged.connect(self.updateLineNumberArea)
        self.verticalScrollBar().valueChanged.connect(self.updateLineNumberArea)

    def resizeEvent(self, event):
        super().resizeEvent(event)
        cr = self.contentsRect()
        self.lineNumberArea.setGeometry(cr.left(), cr.top(), self.lineNumberArea.width(), cr.height())

    def updateLineNumberArea(self):
        self.lineNumberArea.update()

    def keyPressEvent(self, event):
        if event.key() in (Qt.Key_Return, Qt.Key_Enter):
            if event.modifiers() & Qt.ShiftModifier:
                return super().keyPressEvent(event)
            self.submitted.emit()
            return
        return super().keyPressEvent(event)


class DrawingApp(QWidget):
    MARK_SIZE = 4
    MARK_OFFSET = 4
    RECT_MARGIN = 30

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Gerador de Pista")

        layout = QHBoxLayout(self)

        self.scene = QGraphicsScene()
        self.view = QGraphicsView(self.scene)
        self.view.setRenderHint(QPainter.Antialiasing)
        layout.addWidget(self.view, stretch=3)

        right_panel = QVBoxLayout()
        layout.addLayout(right_panel, stretch=1)

        editor_frame = QFrame()
        editor_layout = QHBoxLayout(editor_frame)
        editor_layout.setContentsMargins(0,0,0,0)

        self.editor = CommandEditor()
        self.editor.setPlainText("""inicio 250 100 0
tamanho 600 400
reta 100
reta 100
arco r 100 180
reta 300
arco r 100 180
reta 100
""")
        font = QFont()
        font.setPointSize(20)
        self.editor.setFont(font)
        self.editor.setMinimumWidth(400)
        editor_layout.addWidget(self.editor.lineNumberArea)
        editor_layout.addWidget(self.editor)
        right_panel.addWidget(editor_frame)

        self.btn_draw = QPushButton("Desenhar")
        self.btn_draw.clicked.connect(self.update_scene)
        right_panel.addWidget(self.btn_draw)

        self.btn_labels = QPushButton("Habilitar labels")
        self.btn_labels.setCheckable(True)
        self.btn_labels.setChecked(True)
        self.btn_labels.clicked.connect(self.update_scene)
        right_panel.addWidget(self.btn_labels)

        self.editor.submitted.connect(self.update_scene)

        self.scene.setBackgroundBrush(QBrush(Qt.black))

    def adjust_view_to_rect(self, largura, altura):
        """Ajusta a view para caber no retângulo da pista."""
        self.scene.setSceneRect(0, 0,largura ,altura)
        scene_rect = self.scene.sceneRect()
        # ajusta a view (com margem de 20 px, por ex.)
        self.view.fitInView(scene_rect.adjusted(-20, -20, 20, 20), Qt.KeepAspectRatio)


    def update_scene(self):
        self.scene.clear()
        pen = QPen(Qt.white, 1.9)
        show_labels = self.btn_labels.isChecked()

        x, y, theta = 0.0, 0.0, 0.0
        first_step = True
        first_mark = True

        try:
            lines = self.editor.toPlainText().splitlines()
            for idx, line in enumerate(lines):
                parts = line.split()
                if not parts:
                    continue

                cmd = parts[0].lower()

                if not first_step and not first_mark:
                    self.draw_mark(x, y, theta, pen)

                if not first_step and first_mark:
                    self.draw_mark(x, y, theta, pen, True)
                    first_mark = False

                if cmd == "inicio" and len(parts) == 4:
                    x, y, theta = float(parts[1]), float(parts[2]), float(parts[3])

                elif cmd == "tamanho" and len(parts) == 3:
                    largura, altura = float(parts[1]), float(parts[2])
                    self.scene.setSceneRect(0, 0,largura + 2*self.RECT_MARGIN,altura + 2*self.RECT_MARGIN)
                    self.adjust_view_to_rect(largura, altura)
                    self.draw_rect(largura, altura, pen)

                else:
                    first_step = False

                if cmd == "reta" and len(parts) == 2:
                    d = float(parts[1])
                    x2, y2 = self.draw_line(x, y, theta, d, pen)
                    if show_labels:
                        self.draw_label((x + x2)/2, (y + y2)/2, f"{idx+1}")
                    x, y = x2, y2

                elif cmd == "arco" and len(parts) == 4:
                    side, radius, angle = parts[1], float(parts[2]), float(parts[3])
                    # Calcular ponto médio do arco (sobre o traçado)
                    center_turn = -90 if side == 'l' else 90
                    cx = x + radius * math.cos(deg_to_rad(theta - center_turn))
                    cy = y - radius * math.sin(deg_to_rad(theta - center_turn))
                    # Ângulo inicial do arco
                    start_angle = theta + center_turn
                    # Ângulo do ponto médio do arco
                    mid_angle = start_angle + (angle / 2 if side == 'l' else -angle / 2)
                    mx = cx + radius * math.cos(deg_to_rad(mid_angle))
                    my = cy - radius * math.sin(deg_to_rad(mid_angle))
                    x2, y2, theta2 = self.draw_arc(x, y, theta, side, radius, angle, pen)
                    if show_labels:
                        self.draw_label(mx, my, f"{idx+1}")
                    x, y, theta = x2, y2, theta2

            self.draw_mark(x, y, theta, pen, True)
        except Exception as e:
            from PyQt5.QtWidgets import QMessageBox
            msg = QMessageBox(self)
            msg.setIcon(QMessageBox.Critical)
            msg.setWindowTitle("Erro de comando")
            msg.setText(f"Comando inválido ou erro de sintaxe.\n{str(e)}")
            msg.exec_()

    def draw_label(self, x, y, text):
        label = self.scene.addText(text)
        label.setDefaultTextColor(Qt.yellow)
        font = QFont()
        font.setPointSize(14)
        label.setFont(font)
        label.setPos(x, y - 20)

    def draw_mark(self, x, y, theta, pen, invert=False):
        dx0 = self.MARK_OFFSET * math.cos(deg_to_rad(theta + 90))
        dy0 = self.MARK_OFFSET * math.sin(deg_to_rad(theta + 90))
        dx1 = dx0 + self.MARK_SIZE * math.cos(deg_to_rad(theta + 90))
        dy1 = dy0 + self.MARK_SIZE * math.sin(deg_to_rad(theta + 90))
        if invert: dx0, dx1, dy0, dy1 = -dx0, -dx1, -dy0, -dy1
        self.scene.addLine(x + dx0, y - dy0, x + dx1, y - dy1, pen)

    def draw_line(self, x, y, theta, d, pen):
        dx = d * math.cos(deg_to_rad(theta))
        dy = -d * math.sin(deg_to_rad(theta))
        self.scene.addLine(x, y, x + dx, y + dy, pen)
        return x + dx, y + dy

    def draw_arc(self, x, y, theta, side, radius, angle, pen):
        center_turn = -90 if side == 'l' else 90
        if side != 'l':
            angle = -angle

        cx = x + radius * math.cos(deg_to_rad(theta - center_turn))
        cy = y - radius * math.sin(deg_to_rad(theta - center_turn))

        rect = (cx - radius, cy - radius, 2 * radius, 2 * radius)

        path = QPainterPath()
        path.arcMoveTo(*rect, theta + center_turn)
        path.arcTo(*rect, theta + center_turn, angle)
        self.scene.addPath(path, pen)

        theta += angle
        new_x = cx + radius * math.cos(deg_to_rad(theta + center_turn))
        new_y = cy - radius * math.sin(deg_to_rad(theta + center_turn))
        return new_x, new_y, theta

    def draw_rect(self, largura, altura, pen):
        self.scene.addRect(0, 0, largura, altura, pen)


def deg_to_rad(angle): return math.pi * angle / 180


app = QApplication(sys.argv)
win = DrawingApp()
win.resize(1200, 700)
win.show()
sys.exit(app.exec_())
