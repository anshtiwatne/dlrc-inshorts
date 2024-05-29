'use client'

import {
	Input,
	Button,
	Select,
	SelectItem,
	Textarea,
	Link,
	useDisclosure,
	Modal,
	ModalBody,
	ModalContent,
	ModalHeader,
	Card,
	CardBody,
	CardFooter,
	Tooltip,
	Checkbox,
} from '@nextui-org/react'
import {
	useFirestore,
	useFirestoreCollectionData,
	useFirestoreCollection,
	useStorage,
} from 'reactfire'
import { collection, doc, setDoc } from 'firebase/firestore'
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage'
import { MaterialSymbol } from 'react-material-symbols'
import { useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import NextLink from 'next/link'
// @ts-ignore
import { useExtractColor } from 'react-extract-colors'

import { Loader } from '@/components/loader'
import { generateID } from '@/utils/id'
import { capitalizeTitle } from '@/utils/text'
import { getBgColor } from '@/utils/color'
import { linkifyPreview } from '@/utils/text'

function dataURLToBlob(dataURL: string) {
	const parts = dataURL.split(';base64,')
	const contentType = parts[0].split(':')[1]
	const raw = window.atob(parts[1])
	const rawLength = raw.length
	const uInt8Array = new Uint8Array(rawLength)

	for (let i = 0; i < rawLength; ++i) {
		uInt8Array[i] = raw.charCodeAt(i)
	}

	return new Blob([uInt8Array], { type: contentType })
}

export default function Page() {
	const { theme } = useTheme()
	const db = useFirestore()
	const storage = useStorage()
	const fileInputRef = useRef<HTMLInputElement>(null)

	const {
		isOpen: isGuidelinesOpen,
		onOpen: onGuidelinesOpen,
		onOpenChange: onGuidelinesOpenChange,
	} = useDisclosure()
	const {
		isOpen: isSubmitSuccessOpen,
		onOpen: onSubmitSuccessOpen,
		onOpenChange: onSubmitSuccessOpenChange,
	} = useDisclosure()

	const [image, setImage] = useState<string | null>(null)
	const [isImgLoading, setIsImgLoading] = useState(false)
	const [selectedTag, setSelectedTag] = useState('')
	const [headline, setHeadline] = useState('')
	const [story, setStory] = useState('')
	const [firstName, setFirstName] = useState('')
	const [lastName, setLastName] = useState('')
	const [selectedPseudonym, setSelectedPseudonym] = useState('' as string)
	const [isAnonymous, setIsAnonymous] = useState(false)
	const [isSubmitSuccess, setIsSubmitSuccess] = useState<Boolean | null>(null)
	const [submitBtnDisabled, setSubmitBtnDisabled] = useState(false)

	const { data: tags, status: tagsStatus } = useFirestoreCollectionData(
		collection(db, 'tags'),
	)
	const { data: articles, status: articlesStatus } = useFirestoreCollection(
		collection(db, 'articles'),
	)
	const { data: submissions, status: submissionsStatus } =
		useFirestoreCollection(collection(db, 'submissions'))

	const { dominantColor } = useExtractColor(image)

	const pseudonyms = [
		'DLRC Team',
		'DLRC Facilitator',
		'DLRC Student',
		'DLRC Parent',
	]

	if (
		tagsStatus !== 'success' ||
		articlesStatus !== 'success' ||
		submissionsStatus !== 'success'
	)
		return <Loader />

	function getUsedIDs() {
		const articleIDs = articles.docs.map((doc) => doc.id)
		const submissionIDs = submissions.docs.map((doc) => doc.id)
		const usedIDs = [...articleIDs, ...submissionIDs]

		return usedIDs
	}

	function handleSubmit() {
		setSubmitBtnDisabled(true)
		if (
			image &&
			!isImgLoading &&
			selectedTag &&
			headline.trim().length <= 30 &&
			linkifyPreview(story.trim()).length <= 300 &&
			(firstName.trim() || selectedPseudonym)
		) {
			const usedIDs = getUsedIDs()
			const newID = generateID(usedIDs)
			const submissionRef = doc(db, 'submissions', newID)
			const storageRef = ref(storage, `coverImages/${newID}.webp`)
			const author = isAnonymous
				? selectedPseudonym
				: `${firstName} ${lastName}`.trim()

			fetch(image)
				.then((response) => response.blob())
				.then((blob) => {
					uploadBytes(storageRef, blob).then(() => {
						getDownloadURL(storageRef).then((url) => {
							setDoc(submissionRef, {
								coverImage: url,
								color: getBgColor(dominantColor),
								tag: doc(db, 'tags', selectedTag),
								headline: headline.trim(),
								story: story.trim(),
								author: author,
							}).then(() => {
								handleSubmitSuccess()
							})
						})
					})
				})
		} else {
			handleSubmitFailure()
		}
	}

	function handleSubmitSuccess() {
		setIsSubmitSuccess(true)
		setTimeout(() => {
			setImage(null)
			setSelectedTag('')
			setHeadline('')
			setStory('')
			setFirstName('')
			setLastName('')
			setIsAnonymous(false)
			setSelectedPseudonym('')
			setIsSubmitSuccess(null)
			setSubmitBtnDisabled(false)
			onSubmitSuccessOpen()
		}, 500)
	}

	function handleSubmitFailure() {
		setIsSubmitSuccess(false)
		setTimeout(() => {
			setIsSubmitSuccess(null)
			setSubmitBtnDisabled(false)
		}, 2000)
	}

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0]
		const reader = new FileReader()

		if (file) setIsImgLoading(true)
		reader.onload = (event) => {
			const img = new Image()

			img.onload = async () => {
				const canvas = document.createElement('canvas')

				canvas.width = img.width
				canvas.height = img.height

				const ctx = canvas.getContext('2d')

				ctx?.drawImage(img, 0, 0)

				let low = 0,
					high = 1
				const desiredSize = 100000 // 100 kB
				let blob

				while (high - low > 0.01) {
					const quality = (low + high) / 2
					const webpDataUrl = canvas.toDataURL('image/webp', quality)

					blob = dataURLToBlob(webpDataUrl)

					if (blob.size > desiredSize) {
						high = quality
					} else {
						low = quality
					}
				}

				const url = blob ? URL.createObjectURL(blob) : undefined

				setImage(url ?? null)
				setIsImgLoading(false)
			}
			img.src = event.target?.result as string
		}

		if (file) {
			reader.readAsDataURL(file)
		}
	}

	return (
		<>
			<div className="flex w-[100dvw] flex-col items-center justify-center p-6 pt-2 lg:h-full lg:flex-row lg:gap-8 lg:pt-4">
				<Card
					fullWidth
					className="mb-2 mt-4 border-medium dark:border-transparent"
					shadow="none"
				>
					<CardBody>
						{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
						<div
							className="relative w-full rounded-lg bg-cover bg-center pt-[75%] text-white"
							style={{
								backgroundImage: `url(${image ?? `/images/img-placeholder-${theme === 'light' ? 'light' : 'dark'}.svg`})`,
							}}
							onClick={() =>
								!image && fileInputRef.current?.click()
							}
						/>
					</CardBody>
					<CardFooter className="flex justify-between pt-0">
						<p className="text-sm text-foreground-500">
							Cover image
						</p>
						<input
							ref={fileInputRef}
							hidden
							accept="image/*"
							type="file"
							onChange={handleFileChange}
						/>
						<Button
							color="primary"
							isDisabled={isImgLoading}
							size="sm"
							startContent={
								!isImgLoading && (
									<MaterialSymbol icon="upload" size={20} />
								)
							}
							variant="flat"
							onClick={() => fileInputRef.current?.click()}
						>
							{isImgLoading ? 'Loading...' : 'Upload'}
						</Button>
					</CardFooter>
				</Card>
				<div className="flex w-full flex-col gap-4 lg:justify-between">
					<div className="flex w-full flex-col gap-2">
						<Select
							isRequired
							label="Tag"
							selectedKeys={[selectedTag]}
							value={selectedTag}
							variant="underlined"
							onChange={(e) => setSelectedTag(e.target.value)}
						>
							{Object.keys(tags).map((tagIndex: any) => (
								<SelectItem key={tags[tagIndex].NO_ID_FIELD}>
									{tags[tagIndex].text}
								</SelectItem>
							))}
						</Select>
						<div className="flex w-full items-end gap-1">
							<Input
								isRequired
								autoCapitalize="on"
								isInvalid={headline.trim().length > 30}
								label="Headline"
								value={headline}
								variant="underlined"
								onValueChange={setHeadline}
							/>
							<Tooltip content="Auto capitalize">
								<Button
									isIconOnly
									color="primary"
									size="sm"
									variant="faded"
									onClick={() =>
										setHeadline((prev) =>
											capitalizeTitle(prev),
										)
									}
								>
									<MaterialSymbol
										icon="keyboard_capslock"
										size={20}
									/>
								</Button>
							</Tooltip>
						</div>
						<Textarea
							isRequired
							isInvalid={
								linkifyPreview(story.trim()).length > 300
							}
							label="Story"
							value={story}
							variant="underlined"
							onValueChange={setStory}
						/>
						<Checkbox
							className="pt-6"
							isSelected={isAnonymous}
							onValueChange={setIsAnonymous}
						>
							<span className="text-foreground-600">
								Submit anonymously
							</span>
						</Checkbox>
						{isAnonymous ? (
							<Select
								isRequired
								label="Pseudonym"
								selectedKeys={[selectedPseudonym]}
								value={selectedPseudonym}
								variant="underlined"
								onChange={(e) =>
									setSelectedPseudonym(e.target.value)
								}
							>
								{pseudonyms.map((pseudonym: any) => (
									<SelectItem key={pseudonym}>
										{pseudonym}
									</SelectItem>
								))}
							</Select>
						) : (
							<div className="flex items-center gap-2">
								<Input
									isRequired
									label="First name"
									value={firstName}
									variant="underlined"
									onValueChange={(value) =>
										setFirstName(
											value
												.toLowerCase()
												.split(' ')
												.map(
													(word) =>
														word
															.charAt(0)
															.toUpperCase() +
														word.slice(1),
												)
												.join(' '),
										)
									}
								/>
								<Input
									label="Last name"
									value={lastName}
									variant="underlined"
									onValueChange={(value) =>
										setLastName(
											value
												.toLowerCase()
												.split(' ')
												.map(
													(word) =>
														word
															.charAt(0)
															.toUpperCase() +
														word.slice(1),
												)
												.join(' '),
										)
									}
								/>
							</div>
						)}
					</div>
					<div>
						<Link
							className="my-4 ml-1 w-full cursor-pointer text-left text-sm"
							color="primary"
							onClick={onGuidelinesOpen}
						>
							Guidelines
						</Link>
						<Button
							fullWidth
							className="my-2"
							color={
								isSubmitSuccess === null
									? 'primary'
									: isSubmitSuccess
										? 'success'
										: 'danger'
							}
							disabled={submitBtnDisabled}
							variant={
								isSubmitSuccess === null ? 'flat' : 'bordered'
							}
							onClick={handleSubmit}
						>
							{isSubmitSuccess === null
								? 'Submit'
								: isSubmitSuccess
									? 'Submitted!'
									: 'Check all fields and try again'}
						</Button>
					</div>
				</div>
			</div>
			<Modal
				isOpen={isGuidelinesOpen}
				onOpenChange={onGuidelinesOpenChange}
			>
				<ModalContent>
					{() => (
						<>
							<ModalHeader>Guidelines</ModalHeader>
							<ModalBody className="pb-6">
								<ul className="flex list-disc flex-col gap-4 pl-4">
									<li>
										Articles can be written in either
										English or Hindi
									</li>
									<li>
										Images must have a 4:3 aspect ratio
										(this is what they&apos;ll be cropped to
										on most devices)
									</li>
									<li>
										Headlines must be less than or equal to
										30 characters in length
									</li>
									<li>
										Click the button next to the headline
										input to automatically capitalize lower
										case letters to upper case according to
										the{' '}
										<Link
											isExternal
											as={NextLink}
											href="https://learn.microsoft.com/en-us/style-guide/capitalization#title-style-capitalization"
										>
											Microsoft capitalization style guide
										</Link>
									</li>
									<li>
										Stories must be less than or equal to
										300 characters in length
									</li>
								</ul>
							</ModalBody>
						</>
					)}
				</ModalContent>
			</Modal>
			<Modal
				isOpen={isSubmitSuccessOpen}
				onOpenChange={onSubmitSuccessOpenChange}
			>
				<ModalContent>
					{() => (
						<>
							<ModalHeader className="flex flex-col gap-1 tap-highlight-transparent">
								Article Submitted!
							</ModalHeader>
							<ModalBody className="pb-5">
								<p>
									Your article has been submitted. It should
									be reviewed and published on DLRC Daily
									soon, if it isn&apos;t please let us know.
								</p>
							</ModalBody>
						</>
					)}
				</ModalContent>
			</Modal>
		</>
	)
}