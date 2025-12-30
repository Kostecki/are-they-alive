import { Grid, Text, Title } from "@mantine/core";

import { CustomLink } from "./CustomLink";

type InputProps = {
	children: React.ReactNode;
};

export default function HomePageLayout({ children }: InputProps) {
	return (
		<Grid justify="center" pt="50">
			<Grid.Col span={10}>
				<CustomLink to="/" underline="never" c="dimmed">
					<Title order={1} ta="center">
						Are They Alive?
					</Title>
				</CustomLink>

				<Text c="dimmed" fs="italic" size="sm" ta="center">
					Find out how life treated the cast of your favorite films and shows.
				</Text>

				{children}
			</Grid.Col>
		</Grid>
	);
}
