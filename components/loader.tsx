'use client'

import { CircularProgress } from '@nextui-org/react'

export function Loader() {
	return (
		<div className="absolute inset-0 flex flex-col items-center justify-center">
			<CircularProgress aria-label="loading" size="lg" />
		</div>
	)
}
