const { where, and, or, type, mentions, toPullStream } = require('ssb-db2/operators');

function isDecrypted(message) {
	// Verifica si el mensaje tiene contenido accesible
	return (
	  message &&
	  message.value &&
	  typeof message.value.content === 'object' &&
	  message.value.content !== null
	);
}

export class Backlinks {

	constructor(public ssb: any) {

	}

	read(options) {
		console.log("Todo implement backlinks read: options", options)
		if (!this.ssb.db.query) {
			console.log("Skip backlinks due no db.query")
			return null
		}
		return this.ssb.db?.query(
			where(
			  and(
				// Filtrar mensajes que sean privados y desencriptados (puedes adaptar según tu implementación de privacidad)
				(msg) => isDecrypted(msg),
				or(
				  type('post'), // Mensajes tipo "post"
				  type('blog')  // Mensajes tipo "blog"
				)
			  )
			),
			toPullStream()
		  );
	}
}
