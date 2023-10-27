export const enum SocketErrorCode {
    NetworkError,
    UnexpectedClose,
    Timeout
}

// todo: remove descriptor in production
const SOCKET_ERROR_NAME = Symbol('SocketError');

export type SocketError = Readonly<{
    name: typeof SOCKET_ERROR_NAME,
    code: number,
    event?: Event
}>;

export const isSocketError = (error: any): error is SocketError => error?.name === SOCKET_ERROR_NAME;
const createSocketError = (code: number, event?: Event): SocketError => {
    if (event === undefined) return { name: SOCKET_ERROR_NAME, code };
    else return { name: SOCKET_ERROR_NAME, code, event };
};

export type Socket = {
    readonly websocket: WebSocket,
    isCloseExpected: boolean
};

export const isSocketOpen = (socket: Socket): boolean => socket.websocket.readyState === WebSocket.OPEN;

type Listener = (...args: any[]) => void;
const createCleanListener = (callback: Listener, cleanup: Function): Listener => (...args) => {
    cleanup();
    callback(...args);
};

export const openSocket = async (url: string, timeout: number): Promise<Socket> => {
    const websocket = new WebSocket(url);
    websocket.binaryType = 'arraybuffer';

    const socket = { websocket, isCloseExpected: false };

    return new Promise((resolve, reject) => {
        const cleanup = () => {
            clearTimeout(timeoutIdentifier);
            websocket.removeEventListener('open', openEventListener);
            websocket.removeEventListener('close', closeEventListener);
            websocket.removeEventListener('error', errorEventListener);
        };

        const timeoutCallback = createCleanListener(() => {
            websocket.close();
            reject(createSocketError(SocketErrorCode.Timeout));
        }, cleanup);

        const openEventListener = createCleanListener(() => resolve(socket), cleanup);

        const closeEventListener = createCleanListener(
            (event: CloseEvent) => reject(createSocketError(SocketErrorCode.UnexpectedClose, event)),
            cleanup
        );

        const errorEventListener = createCleanListener(
            (event: Event) => reject(createSocketError(SocketErrorCode.NetworkError, event)),
            cleanup
        );

        const timeoutIdentifier = setTimeout(timeoutCallback, timeout);
        websocket.addEventListener('open', openEventListener);
        websocket.addEventListener('close', closeEventListener);
        websocket.addEventListener('error', errorEventListener);
    });
};

export const closeSocket = (socket: Socket, code?: number) => {
    socket.isCloseExpected = true;
    socket.websocket.close(code);
};

export const getMessageStream = async function* (socket: Socket) {
    if (!isSocketOpen(socket)) return;
    const { websocket } = socket;

    let messagePromiseResolver: Listener;

    const closeEventListener = () => {
        isClosed = true;
        websocket.removeEventListener('message', messageEventListener);
        websocket.removeEventListener('close', closeEventListener);
        websocket.removeEventListener('error', closeEventListener);
        messagePromiseResolver();
    };

    let messages: ArrayBuffer[] = [];
    let isClosed = false;

    const messageEventListener = ({ data }: MessageEvent<ArrayBuffer | string>) => {
        if (typeof data === 'string') return;
        messages.push(data);
        messagePromiseResolver?.();
    };

    websocket.addEventListener('message', messageEventListener);
    websocket.addEventListener('close', closeEventListener);
    websocket.addEventListener('error', closeEventListener);

    yield* messages;
    messages = [];

    while (!isClosed) {
        await new Promise(resolve => messagePromiseResolver = resolve);

        yield* messages;
        messages = [];
    }
};

export const addSocketErrorCallback = (socket: Socket, callback: (error: SocketError) => void) => {
    if (!isSocketOpen(socket)) return;
    const { websocket } = socket;

    const cleanup = () => {
        websocket.removeEventListener('close', closeEventListener);
        websocket.removeEventListener('error', errorEventListener);
    };

    const closeEventListener = createCleanListener((event: CloseEvent) => {
        if (!socket.isCloseExpected) callback(createSocketError(SocketErrorCode.UnexpectedClose, event));
    }, cleanup);

    const errorEventListener = createCleanListener(
        (event: Event) => callback(createSocketError(SocketErrorCode.NetworkError, event)),
        cleanup
    );

    websocket.addEventListener('close', closeEventListener);
    websocket.addEventListener('error', errorEventListener);
};

export const sendMessage = (socket: Socket, message: ArrayBuffer) => {
    if (isSocketOpen(socket)) socket.websocket.send(message);
};
