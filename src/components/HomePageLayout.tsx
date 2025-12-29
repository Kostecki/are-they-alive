import { Grid, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

type InputProps = {
	children: React.ReactNode;
};

export default function HomePageLayout({ children }: InputProps) {
	return (
		<Grid justify="center" pt="50">
			<Grid.Col span={10}>
				<Link to="/">
					<Title order={1} ta="center">
						Are They Alive?
					</Title>
				</Link>
				<Text c="dimmed" fs="italic" size="sm" ta="center">
					Find out how life treated the cast of your favorite films and shows.
				</Text>

				{children}
			</Grid.Col>
		</Grid>
	);
}
