export class Status {
	sync: any = {};

	constructor(ssb) {
		this.sync.plugins = Object.keys(ssb).map((s, i) => { 
			const ss = {}
			ss[s] = i
		});
	}
}