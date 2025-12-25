import { Button, Group, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";

export function NotFound({ children }: { children?: React.ReactNode }) {
	return (
		<Stack gap="sm" p="md" align="center">
			<Text c="dimmed" ta="center">
				{children || "The page you are looking for does not exist."}
			</Text>

			<Group gap="sm">
				<Button component={Link} to="/" variant="filled" color="cyan">
					Go Home
				</Button>
			</Group>
		</Stack>
	);
}
