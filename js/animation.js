window.onload = function(){
    const element = document.querySelector('.cube');
    const container = document.querySelector('body');

    let posX = 0;
    let posY = 0;
    let directionX = 1;
    let directionY = 1;
    const speed = 2; // Pixels per frame

    function moveElement() {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        posX += directionX * speed;
        posY += directionY * speed;

        // Check for collision with container boundaries
        if (posX <= -400 || posX >= containerWidth - element.clientWidth - 400) {
            directionX *= -1; // Reverse direction on X axis
        }
        if (posY <= 0 || posY >= containerHeight - element.clientHeight) {
            directionY *= -1; // Reverse direction on Y axis
        }

        // Update element position
        element.style.left = `${posX}px`;
        element.style.top = `${posY}px`;

        // Request next animation frame
        requestAnimationFrame(moveElement);
    }

    // Start the animation
    moveElement();
}

