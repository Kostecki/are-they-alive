import {
	Anchor,
	Box,
	Button,
	Card,
	Flex,
	Image,
	Loader,
	SimpleGrid,
	Text,
} from "@mantine/core";
import type { NormalizedCast } from "types";

type InputProps = {
	castSections: { title: string; members: NormalizedCast[] }[];
	loadingCast: boolean;
	hasMoreCast: boolean;
	loadMore: () => void;
	castEndRef: React.RefObject<HTMLDivElement | null>;
};

function formatAge(birthday: string | null, deathday: string | null) {
	if (!birthday) return "Unknown";

	const birth = new Date(birthday);

	if (deathday) {
		const death = new Date(deathday);
		let age = death.getFullYear() - birth.getFullYear();
		const m = death.getMonth() - birth.getMonth();

		if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) age--;

		return `${age} years old (${deathday})`;
	} else {
		const now = new Date();
		let age = now.getFullYear() - birth.getFullYear();
		const m = now.getMonth() - birth.getMonth();

		if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;

		return `${age} years old`;
	}
}

function showRole(member: NormalizedCast) {
	return member.characters.join(", ") || "";
}

export default function CastList({
	castSections,
	loadingCast,
	hasMoreCast,
	loadMore,
	castEndRef,
}: InputProps) {
	const hasCast = castSections.some((section) => section.members.length > 0);
	return (
		<Box mt="xl">
			{!hasCast && loadingCast && (
				<Flex justify="center">
					<Loader size="xs" />
				</Flex>
			)}
			{!hasCast && !loadingCast && <div>No cast available</div>}

			{hasCast &&
				castSections.map((section) => (
					<Box key={section.title}>
						{section.title && (
							<Text fw={600} mb="xs">
								{section.title}
							</Text>
						)}

						<SimpleGrid cols={2} spacing="md">
							{section.members.map((member) => {
								return (
									<Anchor
										key={member.id}
										underline="never"
										href={`https://www.themoviedb.org/person/${member.id}`}
										target="_blank"
										rel="noopener"
									>
										<Card
											padding="xs"
											shadow="sm"
											mb="sm"
											radius="md"
											withBorder
											sx={() => ({
												opacity: member.deathday ? 0.5 : 1,
												border: "1px solid transparent",
												transition: "border 0.2s, box-shadow 0.2s",

												"&:hover": {
													border: "1px solid #636363",
													boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
												},
											})}
										>
											<Flex>
												{member.deathday && (
													<Text
														size="xs"
														pos="absolute"
														top="10px"
														right="10px"
													>
														🪦
													</Text>
												)}
												<Image
													w="45px"
													radius="md"
													src={`https://image.tmdb.org/t/p/w45${member.profile_path}`}
													fallbackSrc={
														member.gender === 2 ? "/male.svg" : "/female.svg"
													}
												/>

												<Flex direction="column">
													<Text ml="sm" fw={500}>
														{member.name}
													</Text>
													<Text ml="sm" c="dimmed" fz="sm">
														{showRole(member)}
													</Text>
													<Text ml="sm" c="dimmed" fz="sm">
														{formatAge(member.birthday, member.deathday)}
													</Text>
												</Flex>
											</Flex>
										</Card>
									</Anchor>
								);
							})}

							<div ref={castEndRef} />
						</SimpleGrid>
					</Box>
				))}

			{hasMoreCast && (
				<Flex justify="center" mt="md" mb="xl">
					<Button
						variant="outline"
						onClick={loadMore}
						disabled={loadingCast}
						loading={loadingCast}
						loaderProps={{ type: "dots" }}
					>
						Load more
					</Button>
				</Flex>
			)}
		</Box>
	);
}
