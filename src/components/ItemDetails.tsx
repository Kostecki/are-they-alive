import { Anchor, Box, type BoxProps, Grid, Image, Text } from "@mantine/core";
import type { Result } from "types";

type InputProps = {
	item: Result;
} & BoxProps;

export default function ItemDetails({ item, ...props }: InputProps) {
	return (
		<Box {...props}>
			<Grid>
				<Grid.Col span={3}>
					<Image
						src={
							item.poster_path
								? `https://image.tmdb.org/t/p/w185${item.poster_path}`
								: undefined
						}
						alt={item.label}
						w="100%"
					/>
				</Grid.Col>
				<Grid.Col span="auto">
					<Box>
						<Text fw={700}>
							{item.label} ({item.year})
						</Text>
						{item.subtitle && <Text c="dimmed">{item.subtitle}</Text>}
						<Anchor
							href={`https://www.themoviedb.org/${item.mediaType}/${item.id}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							View on TMDB
						</Anchor>
						<Text
							mt="sm"
							lineClamp={4}
							style={{ wordWrap: "break-word", whiteSpace: "break-spaces" }}
						>
							{item.overview}
						</Text>
					</Box>
				</Grid.Col>
			</Grid>
		</Box>
	);
}
