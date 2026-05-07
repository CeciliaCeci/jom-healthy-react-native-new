import React, { useState, useRef } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://YOUR_IP:8000/ai/chat";

export default function FloatingAIChat() {
  const pan = useRef(new Animated.ValueXY({ x: 300, y: 600 })).current;

  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<any[]>([
    {
      role: "ai",
      text: "Hello! I’m your AI Nutrition Companion.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const lastPosition = useRef({ x: 300, y: 600 });

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
    if (!message.trim()) return;

    const userMessage = message;

    setChat((prev) => [...prev, { role: "user", text: userMessage }]);

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
          text: data.reply,
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
    }

    setLoading(false);
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
        <TouchableOpacity onPress={() => setVisible(true)}>
          <Ionicons name="sparkles" size={28} color="white" />
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>AI Nutrition Companion</Text>

            <TouchableOpacity onPress={() => setVisible(false)}>
              <Ionicons name="close" size={28} />
            </TouchableOpacity>
          </View>

          <ScrollView
              style={styles.chatArea}
              contentContainerStyle={{ paddingBottom: 20 }}
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
                <Text>{msg.text}</Text>
              </View>
            ))}

            {loading && <ActivityIndicator size="small" />}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Ask about nutrition..."
              style={styles.input}
            />

            <TouchableOpacity onPress={sendMessage}>
              <Ionicons name="send" size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    zIndex: 999,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 50,
    justifyContent: "space-between",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
  },

  chatArea: {
    flex: 1,
    paddingHorizontal: 10,
  },

  message: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 5,
  },

  userMessage: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
  },

  aiMessage: {
    backgroundColor: "#F1F1F1",
    alignSelf: "flex-start",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "white",
  },

  input: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginRight: 10,
  },
});