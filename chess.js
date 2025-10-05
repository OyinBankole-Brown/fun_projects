document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('chessboard');

    const pieces = {
        'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
        'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
    };

    let gameBoard = [
        ['r','n','b','q','k','b','n','r'],
        ['p','p','p','p','p','p','p','p'],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['P','P','P','P','P','P','P','P'],
        ['R','N','B','Q','K','B','N','R']
    ];

    let selected = null;
    let currentPlayer = 'white'; // 'white' or 'black'

    function isWhite(piece) {
        return piece && piece === piece.toUpperCase();
    }

    function isBlack(piece) {
        return piece && piece === piece.toLowerCase();
    }

    function findKing(board, color) {
        const king = color === 'white' ? 'K' : 'k';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === king) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    function isSquareAttacked(board, row, col, byColor) {
        // Check if any piece of byColor attacks (row, col)
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;
                if ((byColor === 'white' && isWhite(piece)) || (byColor === 'black' && isBlack(piece))) {
                    if (isLegalMove({ row: r, col: c }, { row, col }, piece, board, true)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function isInCheck(board, color) {
        const kingPos = findKing(board, color);
        if (!kingPos) return false;
        const opponent = color === 'white' ? 'black' : 'white';
        return isSquareAttacked(board, kingPos.row, kingPos.col, opponent);
    }

    function hasAnyLegalMoves(board, color) {
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = board[fromRow][fromCol];
                if (!piece) continue;
                if ((color === 'white' && isWhite(piece)) || (color === 'black' && isBlack(piece))) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (fromRow === toRow && fromCol === toCol) continue;
                            const target = board[toRow][toCol];
                            if (target && ((color === 'white' && isWhite(target)) || (color === 'black' && isBlack(target)))) continue;
                            if (isLegalMove({ row: fromRow, col: fromCol }, { row: toRow, col: toCol }, piece, board)) {
                                // Try the move
                                const newBoard = board.map(row => row.slice());
                                newBoard[toRow][toCol] = piece;
                                newBoard[fromRow][fromCol] = '';
                                if (!isInCheck(newBoard, color)) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    function renderBoard() {
        board.innerHTML = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                if ((row + col) % 2 === 0) {
                    square.classList.add('light');
                } else {
                    square.classList.add('dark');
                }
                square.dataset.row = row;
                square.dataset.col = col;

                // Highlight selected square
                if (selected && selected.row === row && selected.col === col) {
                    square.style.outline = '3px solid orange';
                }

                const piece = gameBoard[row][col];
                if (piece) {
                    square.textContent = pieces[piece];
                }

                square.addEventListener('click', () => handleSquareClick(row, col));
                board.appendChild(square);
            }
        }
        // Show current player and check/checkmate
        document.getElementById('current-player')?.remove();
        const playerDiv = document.createElement('div');
        playerDiv.id = 'current-player';
        let status = `Current turn: ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}`;
        if (isInCheck(gameBoard, currentPlayer)) {
            status += ' — Check!';
            if (!hasAnyLegalMoves(gameBoard, currentPlayer)) {
                status += ' Checkmate!';
            }
        }
        playerDiv.textContent = status;
        board.parentNode.insertBefore(playerDiv, board);
    }

    function isLegalMove(from, to, piece, board = gameBoard, ignorePawnCapture = false) {
        const [fromRow, fromCol] = [from.row, from.col];
        const [toRow, toCol] = [to.row, to.col];
        const target = board[toRow][toCol];

        // Pawn movement
        if (piece === 'P') {
            if (fromCol === toCol && !target) {
                if (toRow === fromRow - 1) return true;
                if (fromRow === 6 && toRow === 4 && !board[5][fromCol]) return true;
            }
            if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow - 1 && target && isBlack(target)) {
                return true;
            }
            // For check detection, allow pawn to "attack" diagonally even if no piece is there
            if (ignorePawnCapture && Math.abs(toCol - fromCol) === 1 && toRow === fromRow - 1) {
                return true;
            }
        }
        if (piece === 'p') {
            if (fromCol === toCol && !target) {
                if (toRow === fromRow + 1) return true;
                if (fromRow === 1 && toRow === 3 && !board[2][fromCol]) return true;
            }
            if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + 1 && target && isWhite(target)) {
                return true;
            }
            if (ignorePawnCapture && Math.abs(toCol - fromCol) === 1 && toRow === fromRow + 1) {
                return true;
            }
        }

        // Rook movement
        if (piece.toLowerCase() === 'r') {
            if (fromRow === toRow || fromCol === toCol) {
                const rowStep = fromRow === toRow ? 0 : (toRow > fromRow ? 1 : -1);
                const colStep = fromCol === toCol ? 0 : (toCol > fromCol ? 1 : -1);
                let r = fromRow + rowStep, c = fromCol + colStep;
                while (r !== toRow || c !== toCol) {
                    if (board[r][c]) return false;
                    r += rowStep;
                    c += colStep;
                }
                return true;
            }
        }

        // Bishop movement
        if (piece.toLowerCase() === 'b') {
            if (Math.abs(fromRow - toRow) === Math.abs(fromCol - toCol)) {
                const rowStep = toRow > fromRow ? 1 : -1;
                const colStep = toCol > fromCol ? 1 : -1;
                let r = fromRow + rowStep, c = fromCol + colStep;
                while (r !== toRow && c !== toCol) {
                    if (board[r][c]) return false;
                    r += rowStep;
                    c += colStep;
                }
                return true;
            }
        }

        // Queen movement
        if (piece.toLowerCase() === 'q') {
            // Rook-like
            if (fromRow === toRow || fromCol === toCol) {
                const rowStep = fromRow === toRow ? 0 : (toRow > fromRow ? 1 : -1);
                const colStep = fromCol === toCol ? 0 : (toCol > fromCol ? 1 : -1);
                let r = fromRow + rowStep, c = fromCol + colStep;
                while (r !== toRow || c !== toCol) {
                    if (board[r][c]) return false;
                    r += rowStep;
                    c += colStep;
                }
                return true;
            }
            // Bishop-like
            if (Math.abs(fromRow - toRow) === Math.abs(fromCol - toCol)) {
                const rowStep = toRow > fromRow ? 1 : -1;
                const colStep = toCol > fromCol ? 1 : -1;
                let r = fromRow + rowStep, c = fromCol + colStep;
                while (r !== toRow && c !== toCol) {
                    if (board[r][c]) return false;
                    r += rowStep;
                    c += colStep;
                }
                return true;
            }
        }

        // Knight movement
        if (piece.toLowerCase() === 'n') {
            if (
                (Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 1) ||
                (Math.abs(fromRow - toRow) === 1 && Math.abs(fromCol - toCol) === 2)
            ) {
                return true;
            }
        }

        // King movement
        if (piece.toLowerCase() === 'k') {
            if (Math.abs(fromRow - toRow) <= 1 && Math.abs(fromCol - toCol) <= 1) {
                return true;
            }
        }

        return false;
    }

    function handleSquareClick(row, col) {
        const piece = gameBoard[row][col];
        if (selected) {
            if (selected.row !== row || selected.col !== col) {
                const from = { row: selected.row, col: selected.col };
                const to = { row, col };
                const movingPiece = gameBoard[selected.row][selected.col];
                if (
                    (!piece || (currentPlayer === 'white' && isBlack(piece)) || (currentPlayer === 'black' && isWhite(piece))) &&
                    isLegalMove(from, to, movingPiece)
                ) {
                    // Simulate move
                    const newBoard = gameBoard.map(r => r.slice());
                    newBoard[to.row][to.col] = movingPiece;
                    newBoard[from.row][from.col] = '';
                    if (!isInCheck(newBoard, currentPlayer)) {
                        gameBoard = newBoard;
                        selected = null;
                        // Check for checkmate
                        const opponent = currentPlayer === 'white' ? 'black' : 'white';
                        if (isInCheck(gameBoard, opponent) && !hasAnyLegalMoves(gameBoard, opponent)) {
                            renderBoard();
                            setTimeout(() => alert(`Checkmate! ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} wins!`), 100);
                        }
                        currentPlayer = opponent;
                        renderBoard();
                        return;
                    } else {
                        alert("You can't move into check!");
                    }
                }
            }
            selected = null;
            renderBoard();
        } else if (piece) {
            if ((currentPlayer === 'white' && isWhite(piece)) || (currentPlayer === 'black' && isBlack(piece))) {
                selected = { row, col };
                renderBoard();
            }
        }
    }

    renderBoard();
});