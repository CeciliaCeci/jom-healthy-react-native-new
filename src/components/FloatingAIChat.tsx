import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  Modal,
  TextInput,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "https://jom-healthy-react-native-new-1.onrender.com/ai/chat";

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

export default function FloatingAIChat() {
  const pan = useRef(new Animated.ValueXY({ x: 300, y: 650 })).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: "Hello! I’m your AI Nutrition Companion 👋 Ask me about food, nutrition, meal planning, or healthy eating.",
    },
  ]);

  const lastPosition = useRef({ x: 300, y: 650 });

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [chat, loading]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 10 ||
          Math.abs(gestureState.dy) > 10
        );
      },

      onPanResponderGrant: () => {
        pan.setOffset({
          x: lastPosition.current.x,
          y: lastPosition.current.y,
        });

        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        {
          useNativeDriver: false,
        }
      ),

      onPanResponderRelease: () => {
        pan.flattenOffset();

        lastPosition.current = {
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        };
      },
    })
  ).current;

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();

    setChat((prev) => [
      ...prev,
      { role: "user", text: userMessage },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const data = await response.json();

      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text:
            data.reply ||
            "Sorry, I couldn't generate a response.",
        },
      ]);
    } catch (error) {
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Unable to connect to AI assistant.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.floatingButton,
          {
            transform: pan.getTranslateTransform(),
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setVisible(true)}
        >
          <Ionicons name="sparkles" size={28} color="white" />
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={visible} animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>AI Nutrition Companion</Text>

              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.chatArea}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {chat.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.message,
                    msg.role === "user"
                      ? styles.userMessage
                      : styles.aiMessage,
                  ]}
                >
                  <Text style={styles.messageText}>{msg.text}</Text>
                </View>
              ))}

              {loading && (
                <View style={styles.aiMessage}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                </View>
              )}
            </ScrollView>

            <View style={styles.inputRow}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Ask about nutrition..."
                placeholderTextColor="#999"
                style={styles.input}
                multiline
              />

              <TouchableOpacity
                onPress={sendMessage}
                disabled={loading}
              >
                <Ionicons
                  name="send"
                  size={24}
                  color={loading ? "#bbb" : "#4CAF50"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    zIndex: 999,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAF8",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },

  chatArea: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  message: {
    padding: 14,
    borderRadius: 16,
    marginVertical: 6,
    maxWidth: "80%",
  },

  userMessage: {
    backgroundColor: "#4CAF50",
    alignSelf: "flex-end",
  },

  aiMessage: {
    backgroundColor: "white",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#222",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "white",
  },

  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: "#F8F8F8",
    fontSize: 15,
  },
});