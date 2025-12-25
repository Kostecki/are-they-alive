import { Button, Group, Stack } from "@mantine/core";
import type { ErrorComponentProps } from "@tanstack/react-router";
import {
	ErrorComponent,
	Link,
	rootRouteId,
	useMatch,
	useRouter,
} from "@tanstack/react-router";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
	const router = useRouter();
	const isRoot = useMatch({
		strict: false,
		select: (state) => state.id === rootRouteId,
	});

	console.error("DefaultCatchBoundary Error:", error);

	return (
		<Stack
			gap="md"
			align="center"
			justify="center"
			style={{ minHeight: "60vh", width: "100%" }}
		>
			<ErrorComponent error={error} />

			<Group gap="sm">
				<Button
					variant="filled"
					color="gray"
					onClick={() => router.invalidate()}
				>
					Try Again
				</Button>

				{isRoot ? (
					<Button component={Link} to="/" variant="filled" color="gray">
						Home
					</Button>
				) : (
					<Button
						variant="filled"
						color="gray"
						onClick={(e) => {
							e.preventDefault();
							window.history.back();
						}}
					>
						Go Back
					</Button>
				)}
			</Group>
		</Stack>
	);
}
