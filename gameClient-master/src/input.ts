import Vector, * as vector from './util/vector.js';

// todo: refactor this module eventually
// todo: handle rebinds eventually
// todo: only record useful button / mouse inputs
// todo: refactor chat input system & prevent game movement while focused

const nameInputElement = document.querySelector('#name-input') as HTMLInputElement;
const chatInputElement = document.querySelector('#chat') as HTMLInputElement;
const chatHolderElement = document.querySelector('#chat-holder') as HTMLDivElement;
const playButtonElement = document.querySelector('#play-button') as HTMLButtonElement;
const ui = document.querySelector('#game-interface') as HTMLDivElement;

const enum MouseButton {
    Left = 0,
    Middle = 1,
    Right = 2
}

export type InputListener = {
    readonly keys: Set<string>,

    readonly mouse: {
        readonly buttons: Set<number>,
        position: Vector
    },

    readonly scrollDeltaQueue: number[],
    readonly chatMessageQueue: string[],

    lastItemSelected: number | null,

    readonly chatInputElement: HTMLInputElement,
    readonly nameInputElement: HTMLInputElement,
    readonly playButtonElement: HTMLButtonElement,

    hasPressedPlay: boolean
};

export const createInputListener = (): InputListener => {
    const keys = new Set<string>();
    addEventListener('keydown', ({ key }) => keys.add(key));

    const buttons = new Set<number>();
    const mouse = { buttons, position: { x: 0, y: 0 } };

    addEventListener('mousemove', ({ x, y }) => mouse.position = { x, y });
    addEventListener('mousedown', ({ button }) => buttons.add(button));
    addEventListener('mouseup', ({ button }) => buttons.delete(button));

    const chatMessageQueue: string[] = [];
    const scrollDeltaQueue: number[] = [];
    addEventListener('wheel', ({ deltaY }) => scrollDeltaQueue.push(deltaY));

    const input: InputListener = {
        keys,
        mouse,
        chatMessageQueue,
        scrollDeltaQueue,
        chatInputElement,
        nameInputElement,
        playButtonElement,
        hasPressedPlay: false,
        lastItemSelected: null
    };

    addEventListener('keyup', ({ key }) => {
        if (key === '1' || key === '2') input.lastItemSelected = Number(key) - 1;

        if (ui.style.display !== 'none' && key === 'Enter') {
            if (chatHolderElement.style.display === 'none') {
                chatHolderElement.style.display = 'block';
                chatInputElement.focus();
            } else {
                const { value } = chatInputElement;
                if (value !== '') chatMessageQueue.push(value);
                chatInputElement.value = '';
                chatHolderElement.style.display = 'none';
            }
        }

        keys.delete(key);
    });

    playButtonElement.addEventListener('click', () => input.hasPressedPlay = true);

    return input;
};

const isKeyDown = (input: InputListener, key: string): boolean => input.keys.has(key);
const isAlphabeticKeyDown = (input: InputListener, key: string): boolean => isKeyDown(input, key) || isKeyDown(input, key.toUpperCase());

const isMovingRight = (input: InputListener): boolean => isAlphabeticKeyDown(input, 'd') || isKeyDown(input, 'ArrowRight');
const isMovingLeft = (input: InputListener): boolean => isAlphabeticKeyDown(input, 'a') || isKeyDown(input, 'ArrowLeft');
const isMovingUp = (input: InputListener): boolean => isAlphabeticKeyDown(input, 'w') || isKeyDown(input, 'ArrowUp');
const isMovingDown = (input: InputListener): boolean => isAlphabeticKeyDown(input, 's') || isKeyDown(input, 'ArrowDown');

const getHorizontalMovementComponent = (input: InputListener): number => Number(isMovingRight(input)) - Number(isMovingLeft(input));
const getVerticalMovementComponent = (input: InputListener): number => Number(isMovingUp(input)) - Number(isMovingDown(input));

export const getMovementDirection = (input: InputListener): number | null => {
    const x = getHorizontalMovementComponent(input);
    const y = getVerticalMovementComponent(input);
    if (x === 0 && y === 0) return null;
    return vector.getDirection({ x, y });
};

export const getPlayerDirection = (input: InputListener): number => {
    const { mouse } = input;
    const centre = { x: innerWidth / 2, y: innerHeight / 2 };
    return vector.getAngleBetween(centre, mouse.position);
};

export const consumeScrollEvents = (input: InputListener): number[] => {
    const deltas = [...input.scrollDeltaQueue];
    input.scrollDeltaQueue.length = 0;
    return deltas;
};

export const consumeChatEvents = (input: InputListener): string[] => {
    const messages = [...input.chatMessageQueue];
    input.chatMessageQueue.length = 0;
    return messages;
};

export const consumeItemSelection = (input: InputListener): number | null => {
    if (input.lastItemSelected === null) return null;
    const { lastItemSelected } = input;
    input.lastItemSelected = null;
    return lastItemSelected;
};

export const getNameInputContent = (input: InputListener): string | null => {
    const { value } = input.nameInputElement;
    return value || null;
};

export const isLeftButtonDown = (input: InputListener): boolean => input.mouse.buttons.has(MouseButton.Left);
export const isRightButtonDown = (input: InputListener): boolean => input.mouse.buttons.has(MouseButton.Right);
