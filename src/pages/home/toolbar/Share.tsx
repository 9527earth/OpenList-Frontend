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
import { batch, createSignal, onCleanup } from "solid-js" // [备注] 移除了原有的 Switch 和 Match 引用
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
  const [link, setLink] = createSignal("") // 用于存储生成的分享信息文本
  const { pathname } = useRouter()
  const { copy } = useUtil()
  const { isOpen, onOpen, onClose } = createDisclosure()

  const expireOptions = [
    { label: "1天", value: "+1d" },
    { label: "2天", value: "+2d" },
    { label: "一周", value: "+1w" },
    { label: "一月", value: "+30d" },
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
          expires: "+1d",
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
    return r.post(`/share/create`, share)
  })

  return (
    <Modal blockScrollOnMount={false} opened={isOpen()} onClose={onClose} size={{ "@initial": "xs", "@md": "md", "@lg": "lg" }}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t("home.toolbar.share")}</ModalHeader>
        <ModalBody>
          <VStack spacing="$3" alignItems="stretch">
            {/* 配置区域 */}
            <HStack spacing="$2" w="$full">
              <Text size="sm" whiteSpace="nowrap" minW="100px">{t("shares.pwd")}:</Text>
              <Input size="sm" value={share.pwd} onInput={(e) => setShare("pwd", e.currentTarget.value)} />
              <IconButton colorScheme="neutral" size="sm" aria-label="random" icon={<TbRefresh />} w="$8" flexShrink={0} onClick={() => setShare("pwd", randomPwd())} />
            </HStack>
            <HStack spacing="$2" w="$full">
              <Text size="sm" whiteSpace="nowrap" minW="100px">{t("shares.max_accessed")}:</Text>
              <Input type="number" size="sm" value={share.max_accessed} onInput={(e) => setShare("max_accessed", parseInt(e.currentTarget.value))} />
            </HStack>
            <HStack spacing="$2" w="$full">
              <Text size="sm" whiteSpace="nowrap" minW="100px">{t("shares.expires")}:</Text>
              <Select size="sm" value={share.expires} onChange={(val: string) => setShare("expires", val)}>
                <SelectOptions options={expireOptions.map(opt => ({ key: opt.value, label: opt.label }))} />
              </Select>
            </HStack>

            {/* [备注要求 1] 在下方增加“分享信息”文本框，默认 4 行 */}
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
        
        <ModalFooter display="flex" gap="$2">
          <Button colorScheme="neutral" onClick={onClose}>{t("global.cancel")}</Button>
          
          {/* [备注要求 2] 确定按钮：点击后生成信息并填入上方文本框，不弹窗 */}
          <Button
            colorScheme="info"
            loading={okLoading()}
            onClick={async () => {
              const finalShare = { ...share };
              if (typeof finalShare.expires === "string" && finalShare.expires.startsWith("+")) {
                finalShare.expires = getExpireDate(finalShare.expires).toISOString();
              }
              const resp = await r.post(`/share/create`, finalShare);
              handleResp(resp, (data) => {
                const templateData = makeTemplateData(data, {
                  site_title: getSetting("site_title"),
                })
                const msg = matchTemplate(getSetting("share_summary_content"), templateData)
                setLink(msg); // 将结果输出到文本框，不跳转 fallback 界面
              })
            }}
          >
            {t("global.confirm")}
          </Button>

          {/* [备注要求 2/3] 新增按钮：复制内容并直接关闭窗口 */}
          <Button
            colorScheme="primary"
            disabled={!link()} // 未生成内容时禁用
            onClick={() => {
              copy(link());
              onClose();
            }}
          >
            复制并关闭
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
