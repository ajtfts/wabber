function Rect(x, y, w, h) {

	const self = {
		x, y, w, h,
		
		get top() {return self.y},
		set top(top) {self.y = top},
		get left() {return self.x},
		set left(left) {self.x = left},
		get bottom() {return self.y+self.h},
		set bottom(bottom) {self.y = bottom-self.h},
		get right() {return self.x+self.w},
		set right(right) {self.x = right-self.w},
		get centery() {return self.y+(self.h/2)},
		set centery(centery) {self.y = centery-(self.h/2)},
		get centerx() {return self.x+(self.w/2)},
		set centerx(centerx) {self.x = centerx-(self.w/2)},

		contains : function contains(other) {
			return (self.left <= other.left &&
					self.right >= other.right &&
					self.top <= other.top &&
					self.bottom >= other.bottom)
		},

		colliderect : function colliderect(other) {
			return (self.left < other.right &&
					self.right > other.left &&
					self.top < other.bottom &&
					self.bottom > other.top)
		},
	}
	return self
}

function initCanvas(location, w, h) {
	
	const draw = {
		rect : function rect(color, Rect, width=0) {
			if (width === 0) {
				ctx.fillStyle = color
				ctx.fillRect(Rect.x, Rect.y, Rect.w, Rect.h)
				return
			} else {
				ctx.strokeStyle = color
				ctx.lineWidth = width
				ctx.rect(Rect.x, Rect.y, Rect.w, Rect.h)
				ctx.stroke()
			}
		},

		polygon : function polygon(color, points, width=0) {
			ctx.moveTo(points[0][0], points[0][1])
			for (let i = 1; i < points.length; i++) {
				ctx.lineTo(points[i][0], points[i][1])
			}
			ctx.closePath()
			if (width === 0) {
				ctx.fillStyle = color
				ctx.fill()
				return
			} else {
				ctx.strokeStyle = color
				ctx.stroke()
			}
		},

		circle : function circle(color, pos, radius, width=0) {
			ctx.beginPath()
			ctx.arc(pos[0], pos[1], radius, 0, 2*Math.PI)
			if (width === 0) {
				ctx.fillStyle = color
				ctx.fill()
				return
			} else {
				ctx.strokeStyle = color
				ctx.stroke()
			}
		},
	}

	function resizeCanvas(w, h, cameraX, cameraY) {
		canvas.width = w
		canvas.height = h
		canvasRect.w = w
		canvasRect.h = h
		if (centerOnResize) {
			ctx.translate(canvas.width/2-cameraX, canvas.height/2-cameraY)
			canvasRect.centerx = canvas.width/2+cameraX
			canvasRect.centery = canvas.height/2+cameraY
		}
	}
	
	function clearScreen() {
		ctx.clearRect(canvasRect.x, canvasRect.y, canvasRect.w, canvasRect.h)
	}

	const canvas = document.createElement("canvas")
	const ctx = canvas.getContext("2d")
	const canvasRect = Rect(0, 0, canvas.width, canvas.height)
	let centerOnResize = false, cx = 0, cy = 0
	canvas.style.outline = "none"
	canvas.style.backgroundColor = "black"
	document.body.insertBefore(canvas, location)
	if (!w) {
		centerOnResize = true
		resizeCanvas(window.innerWidth, window.innerHeight, cx, cy)
	} else {
		canvas.width = w
		canvas.height = h
	}

	return {
		ctx, 
		canvasRect,
		cx, cy,
		draw,
		resizeCanvas,
		clearScreen,
	}
}

function game(surface) {

	function moveCamera(x, y) {
		cameraX += x
		cameraY += y
		surface.ctx.translate(-x, -y)
		surface.canvasRect.centerx = cameraX
		surface.canvasRect.centery = cameraY
	}

	function update() {
		// handle input
		if (keyState['KeyW']) {
			playermoved = player.move(0, -4)
			moveCamera(0, playermoved[1])
		}
		if (keyState['KeyA']) {
			playermoved = player.move(-4, 0)
			moveCamera(playermoved[0], 0)
		}
		if (keyState['KeyS']) {
			playermoved = player.move(0, 4)
			moveCamera(0, playermoved[1])
		}
		if (keyState['KeyD']) {
			playermoved = player.move(4, 0)
			moveCamera(playermoved[0], 0)
		}
	}

	function draw() {
		surface.clearScreen()

		surface.draw.rect("#e3e3e3", worldRect)
		for (let i = 0; i < drawlist.length; i++) {
			surface.draw.rect("#004545", drawlist[i])
		}
	}

	const moveable = (state) => ({
		id : state.id,
		rect : state.rect,
		move : (nx, ny) => {
			nx *= deltaT
			ny *= deltaT
			let temp = [state.rect.x, state.rect.y], xMoved, yMoved
			state.rect.x += nx
			state.rect.y += ny
			if (!state.allowedOutside && !worldRect.contains(state.rect)) {
				if (nx > 0) {
					state.rect.right = worldRect.right
				}
				if (nx < 0) {
					state.rect.left = worldRect.left
				}
				if (ny > 0) {
					state.rect.bottom = worldRect.bottom
				}
				if (ny < 0) {
					state.rect.top = worldRect.top
				}

			}

			xMoved = state.rect.x - temp[0]
			yMoved = state.rect.y - temp[1]
			return [xMoved, yMoved]
		}
	})

	const Player = (id, x, y) => {

		let state = {
			id,
			rect : Rect(x-25, y-25, 50, 50),
			allowedOutside : false
		}
		

		drawlist.push(state.rect)


		let val = Object.assign(
			{},
			moveable(state)
		)
		players.push(val)
		return val
	}

	let socket = io(), initData,
	lastframe = +new Date(), now, deltaT,
	keyState = {},
	players = [],
	playerid,
	cameraX = 0, cameraY = 0, drawlist = [],
	playermoved,
	running = true

	let worldRect = Rect(0, 0, 0, 0)

	window.addEventListener("keydown", (e) => {keyState[e.code] = true})
	window.addEventListener("keyup", (e) => {keyState[e.code] = false})
	window.addEventListener('resize', () => {s.resizeCanvas(window.innerWidth, window.innerHeight, cameraX, cameraY)}, false)


	socket.on('i', (msg) => {initData = msg})
	let waitForConnection = setInterval(() => {
		console.log("connecting...")
		if (typeof initData !== "undefined") {
			console.log("connected!")
			worldRect.w = initData.worldSize[0]
			worldRect.h = initData.worldSize[1]
			worldRect.centerx = 0
			worldRect.centery = 0
			playerid = initData.id
			clearInterval(waitForConnection)
		}
	}, 50)

	player = Player(playerid, 0, 0)

	return {
		run : function run() {
			if (running) {
				now = +new Date()
				deltaT = (now - lastframe) / 16
	
				if (deltaT < 4) {
					update()
					draw()
				}
	
				lastframe = now
				window.requestAnimationFrame(run)
			}
		},
		kill : function kill() {running = false}
	}
}

let s = initCanvas(document.body.childNodes[0])
let hey = game(s)
hey.run()
