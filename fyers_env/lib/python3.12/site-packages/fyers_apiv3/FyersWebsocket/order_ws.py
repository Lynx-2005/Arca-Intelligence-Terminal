from typing import Any, Callable, Dict, Optional
from pkg_resources import resource_filename
import websocket
from threading import Thread
import logging
import threading
import time
import json
from fyers_apiv3.FyersWebsocket import defines
from fyers_apiv3.fyers_logger import FyersLogger


class FyersOrderSocket:

    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(
        self,
        access_token: str,
        write_to_file: Optional[bool] = False,
        log_path: Optional[str] = None,
        on_trades : Optional[Callable] = None,
        on_positions: Optional[Callable] = None,
        on_orders: Optional[Callable] = None,
        on_general: Optional[Callable] = None,
        on_error: Optional[Callable] = None,
        on_connect: Optional[Callable] = None,
        on_close: Optional[Callable] = None,
        reconnect : Optional[Callable] = True,
        reconnect_retry: int = 5 
    ) -> None:
        """
        Initializes the class instance.

        Args:
            access_token (str): The access token to authenticate with.
            write_to_file (bool, optional): Flag indicating whether to save data to a file. Defaults to False.
            log_path (str, optional): The path to the log file. Defaults to None.
            on_trades (callable, optional): Callback function for trade events. Defaults to None.
            on_positions (callable, optional): Callback function for position events. Defaults to None.
            on_orders (callable, optional): Callback function for order events. Defaults to None.
            on_general (callable, optional): Callback function for general events. Defaults to None.
            on_error (callable, optional): Callback function for error events. Defaults to None.
            on_connect (callable, optional): Callback function for connect events. Defaults to None.
            on_close (callable, optional): Callback function for close events. Defaults to None.
            reconnect (bool, optional): Flag indicating whether to attempt reconnection on disconnection. Defaults to True.
        """
        self.__access_token = access_token
        self.log_path = log_path
        self.__ws_object = None
        self.__ws_run = False
        self.ping_thread = None
        self.write_to_file = write_to_file
        self.background_flag = False
        self.reconnect_delay = 0
        self.ontrades = on_trades
        self.onposition = on_positions
        self.restart_flag = reconnect
        self.onorder = on_orders
        self.ongeneral = on_general
        self.onerror = on_error
        self.onopen = on_connect
        self.max_reconnect_attempts = 50
        self.reconnect_attempts = 0
        if reconnect_retry < self.max_reconnect_attempts:
            self.max_reconnect_attempts = reconnect_retry

        self.onclose = on_close
        self.__ws_object = None
        self.running_thread=None
        self.__url = "wss://socket.fyers.in/trade/v3"
        file_path = resource_filename('fyers_apiv3.FyersWebsocket', 'map.json')
        with open(file_path, "r") as file:
            # Imported json file
            mapper = json.load(file)
        self.position_mapper = mapper["position_mapper"]
        self.order_mapper = mapper["order_mapper"]
        self.trade_mapper = mapper["trade_mapper"]


        if log_path:
            self.order_logger = FyersLogger(
                "FyersDataSocket",
                "DEBUG",
                stack_level=2,
                logger_handler=logging.FileHandler(log_path + "/fyersOrderSocket.log"),
            )
        else:
            self.order_logger = FyersLogger(
                "FyersDataSocket",
                "DEBUG",
                stack_level=2,
                logger_handler=logging.FileHandler("fyersOrderSocket.log"),
            )
        self.websocket_task = None

        self.write_to_file = write_to_file
        self.background_flag = False
        self.socket_type = {
            "OnOrders": "orders",
            "OnTrades": "trades",
            "OnPositions": "positions",
            "OnGeneral": ["edis", "pricealerts", "login"],
        }

    def __parse_position_data(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses position data from a message and returns it in a specific format.

        Args:
            msg (str): The message containing position data.

        Returns:
            Dict[str, Any] : The parsed position data in a specific format.

        """
        try:
            position_data = {}
            for key , value in self.position_mapper.items():
                if key in msg["positions"]:
                    position_data[value] = msg["positions"][key]
            
            # Add id_fyers only if the key is present
            if "id_fyers" in msg["positions"]:
                position_data["id_fyers"] = msg["positions"]["id_fyers"]

            return { "s": msg["s"], "positions": position_data}

        except Exception as e:
            self.order_logger.error(e)

    def __parse_trade_data(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses trade data from a message and returns it in a specific format.

        Args:
            msg (str): The message containing trade data.

        Returns:
            Dict[str, Any] : The parsed trade data in a specific format.

        """
        try:
            trade_data = {}
            for key , value in self.trade_mapper.items():
                if key in msg["trades"]:
                    trade_data[value] = msg["trades"][key]
            
            # Add id_fyers only if the key is present
            if "id_fyers" in msg["trades"]:
                trade_data["id_fyers"] = msg["trades"]["id_fyers"]

            return { "s": msg["s"], "trades": trade_data}

        except Exception as e:
            self.order_logger.error(e)

    def __parse_order_data(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses order update data from a dictionary and returns it in a specific format.

        Args:
            msg (Dict[str, Any]): The dictionary containing order update data.

        Returns:
            Dict[str, Any]: The parsed order update data in a specific format.
        """
        try:
            order_data = {}
            for key , value in self.order_mapper.items():
                if key in msg["orders"]:
                    order_data[value] = msg["orders"][key]
                    
            # Add id_fyers only if the key is present
            if "id_fyers" in msg["orders"]:
                order_data["id_fyers"] = msg["orders"]["id_fyers"]
            
            return { "s": msg["s"], "orders": order_data}

        except Exception as e:
            self.order_logger.error(e)

    def on_trades(self, message):
        try:
            if self.ontrades is not None:
                self.ontrades(message)
            else:
                print(f"Trade : {message}")
        except Exception as e:
            self.order_logger.error(e)
            self.On_error(e)

    def on_positions(self, message):
        try:
            if self.onposition is not None:
                self.onposition(message)
            else:
                print(f"Position : {message}")
        except Exception as e:
            self.order_logger.error(e)
            self.On_error(e)

    def on_order(self, message):
        try:
            if self.onorder is not None:
                self.onorder(message)
            else:
                print(f"Order : {message}")
        except Exception as e:
            self.order_logger.error(e)
            self.On_error(e)

    def on_general(self, message):
        try:
            if self.ongeneral is not None:
                self.ongeneral(message)
            else:
                print(f"General : {message}")
        except Exception as e:
            self.order_logger.error(e)
            self.On_error(e)

    def __on_message(self, message: Dict[str, Any]):
        """
        Parses the response data based on its content.

        Args:
            message (str): The response message to be parsed.

        Returns:
            Any: The parsed response data.
        """
        try:
            if message != "pong":
                response = json.loads(message)
                if "orders" in response:
                    response = self.__parse_order_data(response)
                    self.on_order(response)
                elif "positions" in response:
                    response = self.__parse_position_data(response)
                    self.on_positions(response)
                elif "trades" in response:
                    response = self.__parse_trade_data(response)
                    self.on_trades(response)
                else:
                    self.on_general(response)
                
                if self.write_to_file:
                    self.order_logger.debug(f"Response:{response}")


        except Exception as e:
            self.order_logger.error(e)
            self.On_error(e)

    def On_error(self, message: str) -> None:
        """
        Callback function for handling error events.

        Args:
            message (str): The error message.

        """
        if self.onerror is not None:
            self.onerror(message)
            self.order_logger.error(message)
        else:
            if self.write_to_file:
                self.order_logger.debug(f"Response:{message}")
            else:
                print(f"Error Response : {message}")

    def __on_open(self, ws):
        try:
            if self.__ws_object is None:
                self.__ws_object = ws
                self.ping_thread = threading.Thread(target=self.__ping)
                self.ping_thread.start()
                self.reconnect_attempts = 0
                self.reconnect_delay = 0

        except Exception as e:
            self.order_logger.error(e)
            self.On_error(e)

    def __on_close(self, ws, close_code=None, close_reason=None):
        """
        Handle the WebSocket connection close event.

        Args:
            ws (WebSocket): The WebSocket object.
            close_code (int): The code indicating the reason for closure.
            close_reason (str): The reason for closure.

        Returns:
            dict: A dictionary containing the response code, message, and s.
        """
        try:
            if self.restart_flag:
                if self.reconnect_attempts < self.max_reconnect_attempts:
                    if self.write_to_file:
                        self.order_logger.debug(
                            f"Response:{f'Attempting reconnect {self.reconnect_attempts} of {self.max_reconnect_attempts}...'}"
                        )
                    else:
                        print(
                            f"Attempting reconnect {self.reconnect_attempts+1} of {self.max_reconnect_attempts}..."
                        )
                    if (self.reconnect_attempts) % 5 == 0:
                        self.reconnect_delay += 5
                    time.sleep(self.reconnect_delay)
                    self.reconnect_attempts += 1

                    self.__ws_object = None
                    self.connect()
                else:
                    if self.write_to_file:
                        self.order_logger.debug(
                            f"Response:{'Max reconnect attempts reached. Connection abandoned.'}"
                        )
                    else:
                        print("Max reconnect attempts reached. Connection abandoned.")
            else:

                self.on_close(
                    {
                        "code": defines.SUCCESS_CODE,
                        "message": defines.CONNECTION_CLOSED,
                        "s": defines.SUCCESS,
                    }
                )
        except Exception as e:
            self.order_logger.error(e)
            self.On_error(e)

    def __ping(self) -> None:
        """
        Sends periodic ping messages to the server to maintain the WebSocket connection.

        The method continuously sends "__ping" messages to the server at a regular interval
        as long as the WebSocket connection is active.

        """

        while (
            self.__ws_object is not None
            and self.__ws_object.sock
            and self.__ws_object.sock.connected
        ):
            self.__ws_object.send("ping")
            time.sleep(10)

    def on_close(self, message: dict) -> None:
        """
        Handles the close event.

        Args:
            message (dict): The close message .
        """

        if self.onclose:
            self.onclose(message)
        else:
            print(f"Response: {message}")

    def on_open(self) -> None:
        """
        Performs initialization and waits before executing further actions.
        """
        try:
            if self.onopen:
                self.onopen()
        except Exception as e:
            self.On_error(e)

    def is_connected(self):
        """
        Check if the websocket is connected.

        Returns:
            bool: True if the websocket is connected, False otherwise.
        """
        if self.__ws_object:
            return True
        else:
            return False
        

    def __init_connection(self):
        """
        Initializes the WebSocket connection and starts the WebSocketApp.

        The method creates a WebSocketApp object with the specified URL and sets the appropriate event handlers.
        It then starts the WebSocketApp in a separate thread.
        """
        try:
            if self.__ws_object is None:
                if self.write_to_file:
                    self.background_flag = True
                header = {"authorization": self.__access_token}
                ws = websocket.WebSocketApp(
                    self.__url,
                    header=header,
                    on_message=lambda ws, msg: self.__on_message(msg),
                    on_error=lambda ws, msg: self.On_error(msg),
                    on_close=lambda ws, close_code, close_reason: self.__on_close(
                        ws, close_code, close_reason
                    ),
                    on_open=lambda ws: self.__on_open(ws),
                )
                self.t = Thread(target=ws.run_forever) 
                self.t.daemon = self.background_flag
                self.t.start()

        except Exception as e:
            self.order_logger.error(e)

    def keep_running(self):
        """
        Starts an infinite loop to keep the program running.

        """
        self.__ws_run = True
        self.running_thread = Thread(target=self.infinite_loop)
        self.running_thread.start()

    def stop_running(self):
        self.__ws_run = False

    def infinite_loop(self):
        while self.__ws_run:
            time.sleep(0.5)

    def connect(self) -> None:
        """
        Establishes a connection to the WebSocket.

        If the WebSocket object is not already initialized, this method will create the
        WebSocket connection.

        """
        if self.__ws_object is None:
            self.__init_connection()
            time.sleep(2)
        self.on_open()

            
    def close_connection(self):
        """
        Closes the WebSocket connection 

        """
        if self.__ws_object is not None:
            self.restart_flag = False
            self.__ws_object.close()
            self.__ws_object = None
            self.__ws_run = None
            self.running_thread.join()
            self.t.join()
            self.ping_thread.join()

    def subscribe(self, data_type: str) -> None:
        """
        Subscribes to real-time updates of a specific data type.

        Args:
            data_type (str): The type of data to subscribe to, such as orders, position, or holdings.


        """

        try:
            if self.__ws_object is not None:
                self.data_type = []
                for elem in data_type.split(","):
                    if isinstance(self.socket_type[elem], list):
                        self.data_type.extend(self.socket_type[elem])
                    else:
                        self.data_type.append(self.socket_type[elem])
                                
                message = json.dumps(
                    {"T": "SUB_ORD", "SLIST": self.data_type, "SUB_T": 1}
                )
                self.__ws_object.send(message)

        except Exception as e:
            self.order_logger.error(e)

    def unsubscribe(self, data_type: str) -> None:
        """
        Unsubscribes from real-time updates of a specific data type.

        Args:
            data_type (str): The type of data to unsubscribe from, such as orders, position, holdings or general.

        """

        try:
            if self.__ws_object is not None:
                self.data_type = [
                    self.socket_type[(type)] for type in data_type.split(",")
                ]
                message = json.dumps(
                    {"T": "SUB_ORD", "SLIST": self.data_type, "SUB_T": -1}
                )
                self.__ws_object.send(message)

        except Exception as e:
            self.order_logger.error(e)
