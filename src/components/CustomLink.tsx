import { Anchor, type AnchorProps } from "@mantine/core";
import { createLink, type LinkComponent } from "@tanstack/react-router";
import * as React from "react";

interface MantineAnchorProps extends Omit<AnchorProps, "href"> {}

const MantineLinkComponent = React.forwardRef<
	HTMLAnchorElement,
	MantineAnchorProps
>((props, ref) => {
	return <Anchor ref={ref} {...props} />;
});

const CreatedLinkComponent = createLink(MantineLinkComponent);

export const CustomLink: LinkComponent<typeof MantineLinkComponent> = (
	props,
) => {
	return <CreatedLinkComponent preload="intent" {...props} />;
};
