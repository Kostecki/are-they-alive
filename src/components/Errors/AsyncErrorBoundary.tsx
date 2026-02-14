import { Alert, Button, Container } from "@mantine/core";
import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

/**
 * Error boundary for catching async API failures and displaying user-friendly messages
 */
export class AsyncErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("AsyncErrorBoundary caught an error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<Container size="sm" mt="xl">
					<Alert
						title="Something went wrong"
						color="red"
						variant="filled"
						withCloseButton
						onClose={() => this.setState({ hasError: false, error: null })}
					>
						<p>
							{this.state.error?.message ||
								"An unexpected error occurred while loading data."}
						</p>
						<Button
							variant="white"
							color="red"
							size="sm"
							mt="sm"
							onClick={() => window.location.reload()}
						>
							Reload Page
						</Button>
					</Alert>
				</Container>
			);
		}

		return this.props.children;
	}
}
