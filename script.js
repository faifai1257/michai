// script.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Script loaded");

    const menu = document.getElementById('menu');
    const startBtn = document.getElementById('startBtn');
    const gameContainer = document.getElementById('gameContainer');
    const gameCanvas = document.getElementById('gameCanvas');
    const scoreBoard = document.getElementById('scoreBoard');
    const gameOverScreen = document.getElementById('gameOver');
    const finalScore = document.getElementById('finalScore');
    const restartBtn = document.getElementById('restartBtn');

    // Nút điều khiển
    const btnUp = document.getElementById('btnUp');
    const btnDown = document.getElementById('btnDown');
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');

    // Kiểm tra xem các phần tử đã được tìm thấy chưa
    const elements = { menu, startBtn, gameContainer, gameCanvas, scoreBoard, gameOverScreen, finalScore, restartBtn, btnUp, btnDown, btnLeft, btnRight };
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Phần tử với ID '${key}' không tồn tại trong HTML.`);
        }
    }

    if (!gameCanvas) {
        console.error("Canvas không được tìm thấy. Kiểm tra lại ID trong HTML.");
        return; // Ngừng thực thi nếu canvas không tồn tại
    }

    const ctx = gameCanvas.getContext('2d');

    let animationId;
    let score = 0;
    let gameOverFlag = false;
    let nextMilestone = 50; // Khởi tạo ngưỡng điểm số tiếp theo để thêm thịt viên

    // Âm thanh (nên thay thế bằng mã base64 thực tế hoặc đường dẫn tệp âm thanh)
    const collectSound = new Audio('assets/collect.mp3'); // Thay thế bằng đường dẫn thực tế
    const gameOverSound = new Audio('assets/gameover.mp3'); // Thay thế bằng đường dẫn thực tế

    // Kiểm tra âm thanh
    collectSound.addEventListener('error', () => {
        console.error("Không thể tải âm thanh 'collect.mp3'. Kiểm tra đường dẫn.");
    });
    gameOverSound.addEventListener('error', () => {
        console.error("Không thể tải âm thanh 'gameover.mp3'. Kiểm tra đường dẫn.");
    });

    // Đặt kích thước canvas
    function resizeCanvas() {
        gameCanvas.width = window.innerWidth;
        gameCanvas.height = window.innerHeight;
        console.log(`Canvas đã được thay đổi kích thước: ${gameCanvas.width}x${gameCanvas.height}`);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Đối tượng người chơi (Sợi Mì)
    class Noodle {
        constructor() {
            this.path = []; // Mảng lưu trữ các điểm trên đường cong sợi mì
            this.maxPoints = 100; // Số điểm tối đa trong đường cong để giữ độ mềm mại
            this.speed = 5; // Tốc độ di chuyển (pixel mỗi lần cập nhật)
            this.direction = { x: 1, y: 0 }; // Hướng di chuyển ban đầu sang phải
            this.initializePath();
        }

        initializePath() {
            const centerX = gameCanvas.width / 2;
            const centerY = gameCanvas.height / 2;
            // Thêm hai điểm ban đầu để tạo đường cong
            this.path.push({ x: centerX, y: centerY });
            this.path.push({ x: centerX + this.speed, y: centerY });
        }

        draw() {
            if (this.path.length < 2) return;

            ctx.save();
            ctx.lineWidth = 15;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Gradient màu cho sợi mì
            const gradient = ctx.createLinearGradient(
                this.path[0].x,
                this.path[0].y,
                this.path[this.path.length - 1].x,
                this.path[this.path.length - 1].y
            );
            gradient.addColorStop(0, '#f1c40f');
            gradient.addColorStop(1, '#e67e22');
            ctx.strokeStyle = gradient;

            // Bóng đổ
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;

            ctx.beginPath();
            ctx.moveTo(this.path[0].x, this.path[0].y);
            for (let i = 1; i < this.path.length - 2; i++) {
                const xc = (this.path[i].x + this.path[i + 1].x) / 2;
                const yc = (this.path[i].y + this.path[i + 1].y) / 2;
                ctx.quadraticCurveTo(this.path[i].x, this.path[i].y, xc, yc);
            }
            // cuối cùng
            ctx.quadraticCurveTo(
                this.path[this.path.length - 2].x,
                this.path[this.path.length - 2].y,
                this.path[this.path.length - 1].x,
                this.path[this.path.length - 1].y
            );
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }

        update() {
            if (this.direction.x === 0 && this.direction.y === 0) return;

            const lastPoint = this.path[this.path.length - 1];
            const newPoint = {
                x: lastPoint.x + this.direction.x * this.speed,
                y: lastPoint.y + this.direction.y * this.speed
            };

            // Giữ sợi mì trong màn hình
            if (newPoint.x < 20) newPoint.x = 20;
            if (newPoint.x > gameCanvas.width - 20) newPoint.x = gameCanvas.width - 20;
            if (newPoint.y < 20) newPoint.y = 20;
            if (newPoint.y > gameCanvas.height - 20) newPoint.y = gameCanvas.height - 20;

            this.path.push(newPoint);

            // Giữ số lượng điểm trong đường cong
            if (this.path.length > this.maxPoints) {
                this.path.shift();
            }
        }

        setDirection(newDir) {
            // Ngăn chặn việc sợi mì quay ngược lại hướng hiện tại
            if (newDir.x === -this.direction.x && newDir.y === -this.direction.y) return;
            this.direction = newDir;
            console.log(`Hướng di chuyển mới: ${JSON.stringify(this.direction)}`);
        }

        getHead() {
            return this.path[this.path.length - 1];
        }
    }

    // Đối tượng rau (Collectibles)
    class Vegetable {
        constructor() {
            this.radius = 15;
            this.x = Math.floor(Math.random() * (gameCanvas.width / 20)) * 20;
            this.y = Math.floor(Math.random() * (gameCanvas.height / 20)) * 20;
            this.color = '#2ecc71';
            this.draw();
            console.log(`Đã tạo rau tại (${this.x}, ${this.y})`);
        }

        draw() {
            ctx.save();
            // Gradient màu cho rau
            const gradient = ctx.createRadialGradient(this.x, this.y, 5, this.x, this.y, this.radius);
            gradient.addColorStop(0, '#27ae60');
            gradient.addColorStop(1, '#16a085');
            ctx.fillStyle = gradient;

            // Bóng đổ
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            // Vẽ rau dưới dạng hình tròn
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();

            // Vẽ thân lá
            ctx.strokeStyle = '#145a32';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, this.y + this.radius + 5);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }
    }

    // Đối tượng thịt viên (Enemies)
    class Meatball {
        constructor() {
            this.radius = 18;
            this.x = Math.floor(Math.random() * (gameCanvas.width / 20)) * 20;
            this.y = Math.floor(Math.random() * (gameCanvas.height / 20)) * 20;
            this.color = '#c0392b';
            this.speed = 1.5; // Giảm từ 2 xuống 1.5 để thịt viên di chuyển chậm hơn
            this.direction = this.randomDirection();
            this.draw();
            console.log(`Đã tạo thịt viên tại (${this.x}, ${this.y})`);
        }

        randomDirection() {
            const dirs = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ];
            return dirs[Math.floor(Math.random() * dirs.length)];
        }

        draw() {
            ctx.save();
            // Gradient màu cho thịt viên
            const gradient = ctx.createRadialGradient(this.x, this.y, 5, this.x, this.y, this.radius);
            gradient.addColorStop(0, '#d35400');
            gradient.addColorStop(1, '#c0392b');
            ctx.fillStyle = gradient;

            // Bóng đổ
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;

            // Vẽ thịt viên dưới dạng hình tròn
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();

            // Vẽ các đường nét trên thịt viên
            ctx.strokeStyle = '#922B21';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius - 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }

        move() {
            this.x += this.direction.x * this.speed;
            this.y += this.direction.y * this.speed;

            // Kiểm tra va chạm với tường, đổi hướng nếu cần
            if (this.x < this.radius || this.x > gameCanvas.width - this.radius) {
                this.direction.x *= -1;
                console.log(`Thịt viên tại (${this.x}, ${this.y}) đổi hướng X`);
            }
            if (this.y < this.radius || this.y > gameCanvas.height - this.radius) {
                this.direction.y *= -1;
                console.log(`Thịt viên tại (${this.x}, ${this.y}) đổi hướng Y`);
            }
        }
    }

    // Particle Effect khi thu thập rau
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.radius = Math.random() * 3 + 2;
            this.color = color;
            this.speedX = (Math.random() - 0.5) * 4;
            this.speedY = (Math.random() - 0.5) * 4;
            this.opacity = 1;
            this.gravity = 0.02;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.speedY += this.gravity;
            this.opacity -= 0.01;
            this.draw();
        }
    }

    // Khởi tạo đối tượng
    let noodle = new Noodle();
    let vegetables = [];
    let meatballs = [];
    let particles = [];
    let meatballCount = 3; // Số lượng thịt viên ban đầu

    // Hàm tạo rau mới
    function spawnVegetable(maxAttempts = 10) {
        let attempts = 0;
        let veg;
        do {
            veg = new Vegetable();
            attempts++;
            if (attempts > maxAttempts) {
                console.warn('Không thể tạo rau mới không trùng vị trí.');
                return; // Thoát hàm nếu không thể tạo vị trí hợp lệ
            }
        } while (
            noodle.path.some(point => veg.x === point.x && veg.y === point.y) ||
            vegetables.some(existingVeg => veg.x === existingVeg.x && veg.y === existingVeg.y)
        );
        vegetables.push(veg);
    }

    // Hàm tạo thịt viên mới
    function spawnMeatball(maxAttempts = 10) {
        let attempts = 0;
        let meat;
        do {
            meat = new Meatball();
            attempts++;
            if (attempts > maxAttempts) {
                console.warn('Không thể tạo thịt viên mới không trùng vị trí.');
                return; // Thoát hàm nếu không thể tạo vị trí hợp lệ
            }
        } while (
            noodle.path.some(point => meat.x === point.x && meat.y === point.y) ||
            vegetables.some(veg => meat.x === veg.x && meat.y === veg.y) ||
            meatballs.some(existingMeat => meat.x === existingMeat.x && meat.y === existingMeat.y)
        );
        meatballs.push(meat);
    }

    // Tạo rau và thịt viên ban đầu
    for (let i = 0; i < 5; i++) {
        spawnVegetable();
    }
    for (let i = 0; i < meatballCount; i++) {
        spawnMeatball();
    }

    // Xử lý điều khiển bàn phím
    window.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowUp':
                noodle.setDirection({ x: 0, y: -1 });
                break;
            case 'ArrowDown':
                noodle.setDirection({ x: 0, y: 1 });
                break;
            case 'ArrowLeft':
                noodle.setDirection({ x: -1, y: 0 });
                break;
            case 'ArrowRight':
                noodle.setDirection({ x: 1, y: 0 });
                break;
        }
    });

    // Xử lý điều khiển qua nút trên màn hình
    function setupControls() {
        // Touch Events
        btnUp.addEventListener('touchstart', (e) => {
            e.preventDefault();
            noodle.setDirection({ x: 0, y: -1 });
        });
        btnDown.addEventListener('touchstart', (e) => {
            e.preventDefault();
            noodle.setDirection({ x: 0, y: 1 });
        });
        btnLeft.addEventListener('touchstart', (e) => {
            e.preventDefault();
            noodle.setDirection({ x: -1, y: 0 });
        });
        btnRight.addEventListener('touchstart', (e) => {
            e.preventDefault();
            noodle.setDirection({ x: 1, y: 0 });
        });

        // Mouse Events
        btnUp.addEventListener('mousedown', () => { noodle.setDirection({ x: 0, y: -1 }); });
        btnDown.addEventListener('mousedown', () => { noodle.setDirection({ x: 0, y: 1 }); });
        btnLeft.addEventListener('mousedown', () => { noodle.setDirection({ x: -1, y: 0 }); });
        btnRight.addEventListener('mousedown', () => { noodle.setDirection({ x: 1, y: 0 }); });

        // Ngăn chặn các sự kiện mặc định để tránh cuộn trang khi chạm vào nút
        document.getElementById('controls').addEventListener('touchstart', function(e) {
            e.preventDefault();
        }, { passive: false });
    }

    setupControls();

    // Hàm kiểm tra va chạm giữa hai đối tượng
    function isColliding(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (a.radius || 0) + 8; // 8 là khoảng cách an toàn
    }

    // Hàm ném thịt viên khi người chơi click vào chúng
    function throwMeatball(event) {
        const rect = gameCanvas.getBoundingClientRect();
        let mouseX, mouseY;

        if (event.type === 'touchstart') {
            mouseX = event.touches[0].clientX - rect.left;
            mouseY = event.touches[0].clientY - rect.top;
        } else {
            mouseX = event.clientX - rect.left;
            mouseY = event.clientY - rect.top;
        }

        // Tìm thịt viên nào được click
        for (let i = 0; i < meatballs.length; i++) {
            const meat = meatballs[i];
            const dx = mouseX - meat.x;
            const dy = mouseY - meat.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < meat.radius) {
                // Ném thịt viên: loại bỏ thịt viên khỏi mảng
                meatballs.splice(i, 1);
                score += 5; // Tặng điểm khi ném thành công
                collectSound.currentTime = 0;
                collectSound.play();
                console.log(`Ném thành công thịt viên tại (${meat.x}, ${meat.y})`);
                break;
            }
        }
    }

    // Thêm sự kiện click và touchstart vào canvas để ném thịt viên
    gameCanvas.addEventListener('click', throwMeatball);
    gameCanvas.addEventListener('touchstart', (e) => {
        // Xử lý touch tương tự như click
        throwMeatball(e);
    }, { passive: false });

    // Vòng lặp trò chơi
    function gameLoop() {
        if (!isGameRunning) return;

        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        // Cập nhật và vẽ sợi mì
        noodle.update();
        noodle.draw();

        // Di chuyển và vẽ thịt viên
        meatballs.forEach(meat => {
            meat.move();
            meat.draw();
        });

        // Vẽ và kiểm tra rau
        vegetables.forEach((veg, index) => {
            veg.draw();
            // Kiểm tra va chạm với sợi mì
            if (isColliding(veg, noodle.getHead())) {
                score += 10;
                collectSound.currentTime = 0;
                collectSound.play();
                // Thêm particle (giảm từ 20 xuống 10)
                for (let i = 0; i < 10; i++) {
                    particles.push(new Particle(veg.x, veg.y, veg.color));
                }
                vegetables.splice(index, 1);
                spawnVegetable();

                console.log(`Đã thu thập rau. Điểm hiện tại: ${score}`);

                // Kiểm tra và thêm thịt viên khi đạt điểm số
                if (score >= nextMilestone) { // Kiểm tra với ngưỡng điểm số tiếp theo
                    spawnMeatball();
                    nextMilestone += 50; // Tăng ngưỡng điểm số tiếp theo
                    console.log(`Đạt điểm ${score}. Thêm một thịt viên mới.`);
                }
            }
        });

        // Kiểm tra va chạm giữa sợi mì và thịt viên
        meatballs.forEach(meat => {
            if (isColliding(meat, noodle.getHead())) {
                gameOverSound.currentTime = 0;
                gameOverSound.play();
                console.log("Va chạm với thịt viên! Kết thúc trò chơi.");
                endGame();
            }
        });

        // Vẽ và cập nhật các particle
        particles.forEach((particle, index) => {
            particle.update();
            if (particle.opacity <= 0) {
                particles.splice(index, 1);
            }
        });

        // Cập nhật điểm số
        scoreBoard.innerText = 'Điểm: ' + score;

        if (!gameOverFlag) {
            animationId = requestAnimationFrame(gameLoop);
        }
    }

    // Hàm kết thúc trò chơi
    function endGame() {
        isGameRunning = false;
        gameOverFlag = true;
        cancelAnimationFrame(animationId);
        finalScore.innerText = score;
        gameOverScreen.classList.remove('hidden');
        console.log("Trò chơi kết thúc.");
    }

    // Hàm bắt đầu trò chơi
    let isGameRunning = false;

    startBtn.addEventListener('click', () => {
        if (isGameRunning) return; // Ngăn không cho bắt đầu nhiều lần
        isGameRunning = true;
        console.log('Button Bắt Đầu được nhấn');
        menu.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        gameLoop();
    });

    // Hàm chơi lại trò chơi
    restartBtn.addEventListener('click', () => {
        console.log('Button Chơi Lại được nhấn');
        // Reset các biến trò chơi
        noodle = new Noodle();
        vegetables = [];
        meatballs = [];
        particles = [];
        score = 0;
        gameOverFlag = false;
        nextMilestone = 50; // Reset ngưỡng điểm số tiếp theo
        gameOverScreen.classList.add('hidden');

        meatballCount = 3; // Reset số lượng thịt viên ban đầu

        // Tạo lại rau và thịt viên ban đầu
        for (let i = 0; i < 5; i++) {
            spawnVegetable();
        }
        for (let i = 0; i < meatballCount; i++) {
            spawnMeatball();
        }

        // Hủy bất kỳ vòng lặp gameLoop nào đang chạy
        cancelAnimationFrame(animationId);

        // Bắt đầu lại vòng lặp trò chơi
        isGameRunning = true;
        gameLoop();
    });
});
