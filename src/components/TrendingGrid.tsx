import {
	Box,
	type BoxProps,
	Card,
	Image,
	SimpleGrid,
	Text,
} from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";

import type { Result } from "~/types";

type TrendingGridProps = {
	items: Result[];
} & BoxProps;

export default function TrendingGrid({ items, ...props }: TrendingGridProps) {
	const navigate = useNavigate();

	const handleClick = (item: Result) => {
		const titleSlug = item.label
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");

		navigate({
			to: "/$mediaType/$identifier",
			params: {
				mediaType: item.mediaType,
				identifier: `${item.id}-${titleSlug}`,
			},
		});
	};

	return (
		<Box {...props}>
			<SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
				{items.map((item) => (
					<Card
						key={`${item.mediaType}-${item.id}`}
						padding="xs"
						shadow="sm"
						radius="md"
						withBorder
						style={{ cursor: "pointer" }}
						onClick={() => handleClick(item)}
						sx={() => ({
							border: "1px solid transparent",
							transition: "border 0.2s, box-shadow 0.2s",

							"&:hover": {
								border: "1px solid #636363",
								boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
							},
						})}
					>
						<Card.Section>
							<Image
								src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
								alt={item.label}
								fallbackSrc="/placeholder-poster.png"
								loading="lazy"
							/>
						</Card.Section>
						<Box mt="xs">
							<Text fw={500} size="sm" lineClamp={2}>
								{item.label}
							</Text>
							<Text size="xs" c="dimmed">
								{item.year}
							</Text>
						</Box>
					</Card>
				))}
			</SimpleGrid>
		</Box>
	);
}
