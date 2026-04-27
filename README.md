# JomHealthy React Native / Expo 转换版

这是从 Figma Make / Vite Web React 项目转换出来的 Expo React Native 初版。

## 已替换内容

- `react-router` → `@react-navigation/native` + Bottom Tabs + Native Stack
- `lucide-react` → `@expo/vector-icons`
- `div / button / input / img` → `View / Pressable / TextInput / Image`
- Tailwind CSS / `className` → React Native `StyleSheet`
- `recharts` → 使用 `react-native-svg` 实现简化折线图
- `window.open` → `Linking.openURL`
- Web Modal → React Native `Modal`

## 运行方式

```bash
cd jomhealthy-react-native
npm install
npx expo start
```

然后用 Expo Go 扫码，或者按 `a` 跑 Android emulator，按 `i` 跑 iOS simulator。

## 主要目录

```text
src/
  components/      通用组件和弹窗
  context/         语言、儿童资料和膳食状态
  navigation/      React Navigation 路由
  screens/         App 页面
  theme/           颜色主题
  assets/imports/  你原项目中的图片资源
```

## 注意

这是可继续开发的 React Native 结构版，不是 100% 像素级还原。真实相机、真实语音识别、真实营养数据库/API 需要后续接原生能力或后端接口。
