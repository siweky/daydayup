import {
  Button, Input, Select, Upload, List, Card, Statistic, Empty, Spin,
  Alert, Tag, Breadcrumb, Tree, Slider, Segmented,
  Radio, Popconfirm, Drawer, Menu, Tabs, ConfigProvider,
} from 'ant-design-vue'

import {
  SearchOutlined, UploadOutlined, DeleteOutlined, PlusOutlined,
  DownloadOutlined, ShareAltOutlined, ReloadOutlined, SettingOutlined,
  FolderOutlined, FileOutlined, BarChartOutlined, ToolOutlined,
  HomeOutlined, BookOutlined, ThunderboltOutlined, CodeOutlined,
  StarOutlined, ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined,
  InboxOutlined, FileSearchOutlined, FilterOutlined, ExportOutlined,
  MenuOutlined, BulbOutlined, GithubOutlined, LoadingOutlined,
} from '@ant-design/icons-vue'

export default defineNuxtPlugin((nuxtApp) => {
  const components: Record<string, any> = {
    AButton: Button,
    AInput: Input,
    'AInputSearch': Input.Search,
    ASelect: Select,
    AUpload: Upload,
    'AUploadDragger': Upload.Dragger,
    AList: List,
    'AListItem': List.Item,
    'AListItemMeta': List.Item.Meta,
    ACard: Card,
    AStatistic: Statistic,
    AEmpty: Empty,
    ASpin: Spin,
    AAlert: Alert,
    ATag: Tag,
    ABreadcrumb: Breadcrumb,
    'ABreadcrumbItem': Breadcrumb.Item,
    ATree: Tree,
    ASlider: Slider,
    ASegmented: Segmented,
    ARadio: Radio,
    'ARadioGroup': Radio.Group,
    'ARadioButton': Radio.Button,
    APopconfirm: Popconfirm,
    ADrawer: Drawer,
    AMenu: Menu,
    ATabs: Tabs,
    AConfigProvider: ConfigProvider,
  }

  for (const [name, comp] of Object.entries(components)) {
    if (comp) nuxtApp.vueApp.component(name, comp)
  }

  const icons: Record<string, any> = {
    SearchOutlined, UploadOutlined, DeleteOutlined, PlusOutlined,
    DownloadOutlined, ShareAltOutlined, ReloadOutlined, SettingOutlined,
    FolderOutlined, FileOutlined, BarChartOutlined, ToolOutlined,
    HomeOutlined, BookOutlined, ThunderboltOutlined, CodeOutlined,
    StarOutlined, ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined,
    InboxOutlined, FileSearchOutlined, FilterOutlined, ExportOutlined,
    MenuOutlined, BulbOutlined, GithubOutlined, LoadingOutlined,
  }

  for (const [name, comp] of Object.entries(icons)) {
    if (comp) nuxtApp.vueApp.component(name, comp)
  }
})
