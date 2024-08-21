import { GameSocket } from './event';

const ENDPOINT = import.meta.env.VITE_SOCKET_ENDPOINT;

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (socket == null) {
    console.log('create socket at ' + ENDPOINT);
    socket = new GameSocket(ENDPOINT);
  }

  return socket;
}
