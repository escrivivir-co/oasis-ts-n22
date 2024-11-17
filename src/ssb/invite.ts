import * as ssbClient from 'ssb-db2';
import * as ssbKeys from 'ssb-keys';
import ssb from '.';

type SSBInvitation = {
  host: string;
  port: number;
  publicKey: string;
  capabilityToken?: string;
};

/**
 * Método para aceptar una invitación SSB
 * @param inviteCode Invitación en formato string
 */
export async function acceptInvite(ssbClient: any, inviteCode: string): Promise<void> {
  // Parsear la invitación
  const regex = /^([^:]+):(\d+):@([a-zA-Z0-9+/=]+\.ed25519)~\/?([a-zA-Z0-9+/=]*)?$/;
  const match = inviteCode.match(regex);

  if (!match) {
    throw new Error("Formato de invitación no válido.");
  }

  const [, host, port, publicKey, capabilityToken] = match;
  const invitation: SSBInvitation = {
    host,
    port: parseInt(port, 10),
    publicKey,
    capabilityToken,
  };

  console.log("Procesando invitación:", invitation);

  // Generar claves del cliente
  const keys = ssbKeys.generate();

  // Conectar al servidor remoto
  return new Promise((resolve, reject) => {
	console.log("Conectando con el servidor SSB.", `net:${host}:${port}~shs:${publicKey.replace(
          ".ed25519",
          ""
        )}`);

		console.log(ssbClient)
    ssbClient.conn.connect(
     `net:${host}:${port}~shs:${publicKey.replace(
          ".ed25519",
          ""
        )}`,
      (err: any, ssb: any) => {
        if (err) {
          console.error("Error al conectar con el servidor SSB:", err);
          reject(err);
          return;
        }
        console.log("Conexión establecida con el servidor SSB.");

        // Autorizar con el token (si existe)
        if (capabilityToken) {
          ssb.auth(capabilityToken, (authErr: any, authResponse: any) => {
            if (authErr) {
              console.error("Error al autorizar con el token:", authErr);
              reject(authErr);
            } else {
              console.log("Autorización exitosa:", authResponse);
              resolve();
            }
          });
        } else {
          console.warn("No se proporcionó un token de capacidad.");
          resolve();
        }
      }
    );
  });
}

// Ejemplo de uso
const inviteCode =
  "solarnethub.com:8008:@1wOEiCjJJ0nEs1OABUIV20valZ1LHUsfHJY/ivBoM8Y=.ed25519~/r4Z7VSML2zV1quwBdiyRy6e1j+CqDhagkbJOEbpc4g=";


