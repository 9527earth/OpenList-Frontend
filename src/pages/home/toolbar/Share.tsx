import { useFetch, useRouter, useT, useUtil } from "~/hooks"
import {
  bus,
  handleResp,
  makeTemplateData,
  matchTemplate,
  r,
  randomPwd,
  getExpireDate,
} from "~/utils"
import { batch, createSignal, onCleanup } from "solid-js"
import {
  Button,
  createDisclosure,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  Textarea,
  VStack,
} from "@hope-ui/solid"
import {
  ExtractFolder,
  OrderBy,
  OrderDirection,
  PResp,
  Share as ShareType,
  ShareInfo,
} from "~/types"
import { createStore } from "solid-js/store"
import { getSetting, me, selectedObjs } from "~/store"
import { TbRefresh } from "solid-icons/tb"
import { SelectOptions } from "~/components"

export const Share = () => {
  const t = useT()
  const [link, setLink] = createSignal("") 
  const { pathname } = useRouter()
  const { copy } = useUtil()
  const { isOpen, onOpen, onClose } = createDisclosure()

  // 有效期选项：2天(默认), 1周, 1月, 1年, 永久[cite: 7]
  const expireOptions = [
    { label: "2天", value: "+2d" },
    { label: "1周", value: "+1w" },
    { label: "1月", value: "+30d" },
    { label: "1年", value: "+1y" },
    { label: "永久", value: "" },
  ]

  const handler = (name: string) => {
    if (name === "share") {
      batch(() => {
        setLink("")
        const paths = selectedObjs().map((obj) => {
          const split = pathname().endsWith("/") || obj.name.startsWith("/") ? "" : "/"
          return `${me().base_path}${pathname()}${split}${obj.name}`
        })
        setShare({
          files: paths,
          expires: "+2d", // 默认2天[cite: 7]
          pwd: "",
          max_accessed: 0,
          order_by: OrderBy.None,
          order_direction: OrderDirection.None,
          extract_folder: ExtractFolder.None,
          remark: "",
          readme: "",
          header: "",
        } as ShareType)
      })
      onOpen()
    }
  }

  bus.on("tool", handler)
  onCleanup(() => bus.off("tool", handler))

  const [share, setShare] = createStore<ShareType>({} as ShareType)
  const [okLoading, ok] = useFetch((): PResp<ShareInfo> => {
    const finalShare = { ...share }
    if (typeof finalShare.expires === "string" && finalShare.expires.startsWith("+")) {
      finalShare.expires = getExpireDate(finalShare.expires).toISOString()
    }
    return r.post(`/share/create`, finalShare)
  })

  return (
    <Modal blockScrollOnMount={false} opened={isOpen()} onClose={onClose} size={{ "@initial": "xs", "@md": "md", "@lg": "lg" }}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t("home.toolbar.share")}</ModalHeader>
        <ModalBody>
          <VStack spacing="$3" alignItems="stretch">
            {/* 分享码配置[cite: 7] */}
            <HStack spacing="$2" w="$full">
              <Text size="sm" whiteSpace="nowrap" minW="100px">{t("shares.pwd")}:</Text>
              <Input size="sm" value={share.pwd} onInput={(e) => setShare("pwd", e.currentTarget.value)} />
              <IconButton colorScheme="neutral" size="sm" aria-label="random" icon={<TbRefresh />} w="$8" flexShrink={0} onClick={() => setShare("pwd", randomPwd())} />
            </HStack>
            
            {/* 最大访问次数配置[cite: 7] */}
            <HStack spacing="$2" w="$full">
              <Text size="sm" whiteSpace="nowrap" minW="100px">{t("shares.max_accessed")}:</Text>
              <Input type="number" size="sm" value={share.max_accessed} onInput={(e) => setShare("max_accessed", parseInt(e.currentTarget.value))} />
            </HStack>
            
            {/* 过期时间下拉选择框（2天默认）[cite: 7] */}
            <HStack spacing="$2" w="$full">
              <Text size="sm" whiteSpace="nowrap" minW="100px">{t("shares.expires")}:</Text>
              <Select size="sm" value={share.expires} onChange={(val: string) => setShare("expires", val)}>
                <SelectOptions options={expireOptions.map(opt => ({ key: opt.value, label: opt.label }))} />
              </Select>
            </HStack>

            {/* 分享信息文本框[cite: 7] */}
            <VStack spacing="$1" alignItems="flex-start" mt="$2">
              <Text size="sm" fontWeight="$bold">分享信息:</Text>
              <Textarea
                readOnly
                placeholder="点击“确认”生成分享内容"
                size="sm"
                variant="filled"
                value={link()}
                rows={4}
              />
            </VStack>
          </VStack>
        </ModalBody>
        
        {/* 底部按钮组（取消、确认、复制并关闭）[cite: 7] */}
        <ModalFooter display="flex" gap="$2">
          <Button colorScheme="neutral" onClick={onClose}>{t("global.cancel")}</Button>
          
          <Button
            colorScheme="info"
            loading={okLoading()}
            onClick={async () => {
              const resp = await ok()
              handleResp(resp, (data) => {
                const templateData = makeTemplateData(data, {
                  site_title: getSetting("site_title"),
                })
                const msg = matchTemplate(getSetting("share_summary_content"), templateData)
                setLink(msg) 
              })
            }}
          >
            {t("global.confirm")}
          </Button>

          <Button
            colorScheme="primary"
            disabled={!link()} 
            onClick={() => {
              copy(link())
              onClose()
            }}
          >
            复制并关闭
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
