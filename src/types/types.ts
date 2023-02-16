import {VoteContent} from 'ssb-typescript';

export interface message {
    key: string,
    sync?: boolean,
    value: {
        author: string,
        sequence?: number,
        content: {
            type: string,
            text: string,
            root?: string,
            name?: string,
            about?: string,
            contentWarning?: string,
            channel?:string,
            subscribed?:boolean
        },
        timestamp: number,
        meta: {
            isPrivate: boolean,
            votes: IVoteRef[],
            thread?: message[],
            author: {
                name: string,
                avatar: {
                    url: string,
                },
            },
        },
    },
};

export interface pub {
    host: string,
    announcers: string,
    key: string
}

export interface IBlob {
    id: string,
    name: string,
    mime?: string
}

export interface IVoteRef {
    key: string,
    value: {
        author: string,
        content: VoteContent
    }
}

export interface IConfig {
    [x: string]: unknown;
    open: boolean;
    offline: boolean;
    host: string;
    "allow-host": any;
    allowHost: any;
    port: number;
    public: boolean;
    debug: boolean;
    theme: string;
    _?: (string | number)[];
    $0?: string;
}

export type ISsbClient = any;//TODO: typeme