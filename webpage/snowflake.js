"use strict"

// eslint-disable-next-line no-unused-vars
class SnowFlake {
	static SnowFlakes = new Map()
	// eslint-disable-next-line unicorn/consistent-function-scoping
	static FinalizationRegistry = new FinalizationRegistry(a => {
		SnowFlake.SnowFlakes.get(a[1]).delete(a[0])
	})
	constructor(id, obj) {
		this.id = id
		if (!obj) return

		const className = obj.constructor
		if (!SnowFlake.SnowFlakes.get(className)) SnowFlake.SnowFlakes.set(className, new Map())

		if (SnowFlake.SnowFlakes.get(className).get(id)) {
			const snowflake = SnowFlake.SnowFlakes.get(className).get(id).deref()
			snowflake.obj = obj
			if (snowflake) return

			SnowFlake.SnowFlakes.get(className).delete(id)
		}

		SnowFlake.SnowFlakes.get(className).set(id, new WeakRef(this))
		SnowFlake.FinalizationRegistry.register(this, [id, className])
		this.obj = obj
	}
	static clear() {
		this.SnowFlakes = new Map()
	}
	static getSnowFlakeFromID(id, type) {
		if (!SnowFlake.SnowFlakes.get(type)) SnowFlake.SnowFlakes.set(type, new Map())

		const snowflake = SnowFlake.SnowFlakes.get(type).get(id)
		if (snowflake) {
			const obj = snowflake.deref()
			if (obj) return obj

			SnowFlake.SnowFlakes.get(type).delete(id)
		}

		const newSnowflake = new SnowFlake(id, void 0)
		SnowFlake.SnowFlakes.get(type).set(id, new WeakRef(newSnowflake))
		SnowFlake.FinalizationRegistry.register(this, [id, type])
		return newSnowflake
	}
	static hasSnowFlakeFromID(id, type) {
		if (!SnowFlake.SnowFlakes.get(type)) return false

		const flake = SnowFlake.SnowFlakes.get(type).get(id)
		if (flake) {
			const flake2 = flake.deref()?.getObject()
			return Boolean(flake2)
		}

		return false
	}
	getUnixTime() {
		return Number((BigInt(this.id) >> 22n) + 1420070400000n)
	}
	toString() {
		return this.id
	}
	getObject() {
		return this.obj
	}
}
