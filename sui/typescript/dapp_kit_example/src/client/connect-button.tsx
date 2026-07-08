import * as React from 'react';
import { createComponent } from '@lit/react';
import { DAppKitConnectButton as ConnectButtonElement } from '@mysten/dapp-kit-core/web';
import type { ComponentProps } from 'react';
import { dAppKit } from './dapp-kit.js';

export type ConnectButtonProps = ComponentProps<typeof ConnectButtonComponent>;

const ConnectButtonComponent = createComponent({
	react: React,
	tagName: 'mysten-dapp-kit-connect-button',
	elementClass: ConnectButtonElement,
});

export function ConnectButton({ instance, ...props }: ConnectButtonProps) {
	return <ConnectButtonComponent {...props} instance={dAppKit} />;
}
