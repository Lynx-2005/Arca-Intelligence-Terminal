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
from typing import Set, List
import fyers_apiv3.FyersWebsocket.msg_pb2 as protomsg
from enum import Enum
import requests

## Models and definitions

def getUrl(access_token: str):
    """
    Get the URL for the WebSocket connection.

    Args:
        access_token (str): The access token to authenticate with. Format: APPID:SECRET_KEY

    Returns:
        str: The URL for the WebSocket connection.
    """
    data = requests.get('https://api-t1.fyers.in/indus/home/tbtws', headers={'Authorization': f'{access_token}'})
    if data.status_code == 200:
        return data.json()['data']['socket_url']
    return "wss://rtsocket-api.fyers.in/versova"

class SubscriptionModes(Enum):
    DEPTH = "depth"

class Depth:
    def __init__(self):
        self.tbq: int = 0
        self.tsq: int = 0
        self.bidprice: List[float] = [0.0] * 50
        self.askprice: List[float] = [0.0] * 50
        self.bidqty: List[float] = [0] * 50
        self.askqty: List[float] = [0] * 50
        self.bidordn: List[float] = [0] * 50
        self.askordn: List[float] = [0] * 50
        self.snapshot: bool = False
        self.timestamp: int = 0
        self.sendtime: int = 0
        self.seqNo: int = 0

    def __str__(self):
        return (f"Depth{{ts: {self.timestamp}, "
                f"send_ts: {self.sendtime}, "
                f"tbq: {self.tbq}, tsq: {self.tsq}, "
                f"bidprice: {self.bidprice}, askprice: {self.askprice}, "
                f"bidqty: {self.bidqty}, askqty: {self.askqty}, "
                f"bidordn: {self.bidordn}, askordn: {self.askordn}, "
                f"snapshot: {self.snapshot}, sNo: {self.seqNo} }}")
    
    def _addDepth(self, currdata: protomsg.MarketFeed, isSnapshot: bool):
        if currdata.HasField('depth'):
            self.snapshot = isSnapshot
            if currdata.depth.HasField('tbq'):
                self.tbq = currdata.depth.tbq.value

            if currdata.depth.HasField('tsq'):
                self.tsq = currdata.depth.tsq.value

            if currdata.depth.asks is not None:
                for i in range(len(currdata.depth.asks)):
                    if currdata.depth.asks[i].HasField('price'):
                        self.askprice[i] = currdata.depth.asks[i].price.value / 100

                    if currdata.depth.asks[i].HasField('qty'):
                        self.askqty[i] = currdata.depth.asks[i].qty.value

                    if currdata.depth.asks[i].HasField('nord'):
                        self.askordn[i] = currdata.depth.asks[i].nord.value
                        
            if currdata.depth.bids is not None:
                for i in range(len(currdata.depth.bids)):
                    if currdata.depth.bids[i].HasField('price'):
                        self.bidprice[i] = currdata.depth.bids[i].price.value / 100

                    if currdata.depth.bids[i].HasField('qty'):
                        self.bidqty[i] = currdata.depth.bids[i].qty.value

                    if currdata.depth.bids[i].HasField('nord'):
                        self.bidordn[i] = currdata.depth.bids[i].nord.value
            
            self.timestamp = currdata.feed_time.value
            self.sendtime = currdata.send_time.value
            self.seqNo = currdata.sequence_no

class SubscriptionInfo:
    def __init__(self) -> None:
        self._symbols: Dict[str, Set[str]] = {}
        self._modeInfo: Dict[str, SubscriptionModes] = {}
        self._activeChannels: Set[str] = set()

    def subscribe(self, symbols: Set[str], channelNo: str, mode: SubscriptionModes) -> None:
        if channelNo in self._symbols:
            self._symbols[channelNo].update(symbols)
        else:
            self._symbols[channelNo] = set(symbols)
        self._modeInfo[channelNo] = mode

    def unsubscribe(self, symbols: Set[str], channelNo: str) -> None:
        if channelNo in self._symbols:
            self._symbols[channelNo].difference_update(symbols)
            if not self._symbols[channelNo]:
                del self._symbols[channelNo]

    def updateChannels(self, pauseChannels: Set[str], resumeChannels: Set[str]) -> None:
        self._activeChannels.difference_update(pauseChannels)
        self._activeChannels.update(resumeChannels)

    def updateMode(self, modeConfig: Dict[str, SubscriptionModes]) -> None:
        for channelNo, mode in modeConfig.items():
            self._modeInfo[channelNo] = mode

    def getSymbolsInfo(self, chanNo: str) -> Set[str]:
        return self._symbols[chanNo]

    def getModeInfo(self, chanNo: str) -> SubscriptionModes:
        return self._modeInfo[chanNo]

    def getChannelInfo(self) -> Set[str]:
        return self._activeChannels
    

class DataStore:
  depth: Dict[str, Depth] = {}

  def updateDepth(self, packet: protomsg.SocketMessage, cb: Optional[Callable], diffOnly: bool):
    if packet.feeds is not None:
        for _, value in packet.feeds.items():
            symbol = value.ticker
            if symbol not in self.depth:
                self.depth[symbol] = Depth()
            if not diffOnly:
                self.depth[symbol]._addDepth(value, packet.snapshot)
                cb(symbol, self.depth[symbol])     
            else:
                depth = Depth() 
                depth._addDepth(value, packet.snapshot)
                cb(symbol, depth)     


class FyersTbtSocket:

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
        on_depth_update: Optional[Callable] = None,
        on_error_message:   Optional[Callable] = None,
        on_error: Optional[Callable] = None,
        on_connect: Optional[Callable] = None,
        on_close: Optional[Callable] = None,
        on_open: Optional[Callable] = None,
        reconnect : Optional[Callable] = True,
        diff_only: bool = False,
        reconnect_retry: int = 5 
    ) -> None:
        """
        Initializes the class instance.

        Args:
            access_token (str): The access token to authenticate with.
            write_to_file (bool, optional): Flag indicating whether to save data to a file. Defaults to False.
            log_path (str, optional): The path to the log file. Defaults to None.
            on_depth_update (callable, optional): Callback function for 50 depth events. Defaults to None.
            on_error_message (callable, optional): Callback function for error msg received from server. Defaults to None.
            on_error (callable, optional): Callback function for error events. Defaults to None.
            on_connect (callable, optional): Callback function for connect events. Defaults to None.
            on_close (callable, optional): Callback function for close events. Defaults to None.
            on_open (callable, optional): Callback function for open events. Defaults to None.
            reconnect (bool, optional): Flag indicating whether to attempt reconnection on disconnection. Defaults to True.
        """
        self._datastore = DataStore()
        self._subsinfo = SubscriptionInfo()
        self.__access_token = access_token
        self.log_path = log_path
        self.__ws_object = None
        self.__ws_run = False
        self.ping_thread = None
        self.write_to_file = write_to_file
        self.background_flag = False
        self.reconnect_delay = 0
        self.onDepthUpdate = on_depth_update
        self.onErrorMsg = on_error_message
        self.restart_flag = reconnect
        self.onerror = on_error
        self.onopen = on_connect
        self.max_reconnect_attempts = 50
        self.reconnect_attempts = 0
        self.diff_only = diff_only
        if reconnect_retry < self.max_reconnect_attempts:
            self.max_reconnect_attempts = reconnect_retry

        self.onclose = on_close
        self.onopen = on_open
        self.__ws_object = None
        self.running_thread=None
        self.__url = getUrl(access_token)

        if log_path:
            self.tbtlogger = FyersLogger(
                "FyersTbtSocket",
                "DEBUG",
                stack_level=2,
                logger_handler=logging.FileHandler(log_path + "/fyersTBTSocket.log"),
            )
        else:
            self.tbtlogger = FyersLogger(
                "FyersTbtSocket",
                "DEBUG",
                stack_level=2,
                logger_handler=logging.FileHandler("fyersTBTSocket.log"),
            )
        self.websocket_task = None

        self.write_to_file = write_to_file
        self.background_flag = False
        
    def subscribe(self, symbol_tickers: Set[str], channelNo: str, mode: SubscriptionModes) -> None:
        """
        Subscribe to a specific channel with the given symbols and mode.

        Args:
            symbol_tickers (Set[str]): The set of symbol tickers to subscribe to.
            channelNo (str): The channel number to subscribe to. Should be between 1 and 50
            mode (SubscriptionModes): The mode of subscription.
        """
        if (
            self.__ws_object is not None
            and self.__ws_object.sock
            and self.__ws_object.sock.connected
        ):
            self._subsinfo.subscribe(symbol_tickers, channelNo, mode)
            self.__ws_object.send(
                json.dumps(
                    {
                        "type": 1,
                        "data": {
                            "subs": 1,
                            "symbols": list(symbol_tickers),
                            "mode": mode.value,
                            "channel": channelNo,
                        },
                    }
                )
            )

    def unsubscribe(self, symbol_tickers: Set[str], channelNo: str, mode: SubscriptionModes) -> None:
        """
        Unsubscribe from a specific channel with the given symbols and mode.

        Args:
            symbol_tickers (Set[str]): The set of symbol tickers to unsubscribe from.
            channelNo (str): The channel number to unsubscribe from. Should be between 1 and 50
            mode (SubscriptionModes): The mode of subscription.
        """
        if (
            self.__ws_object is not None
            and self.__ws_object.sock
            and self.__ws_object.sock.connected
        ):  
            self._subsinfo.unsubscribe(symbol_tickers, channelNo)
            self.__ws_object.send(
                json.dumps(
                    {
                        "type": 1,
                        "data": {
                            "subs": -1,
                            "symbols": list(symbol_tickers),
                            "mode": mode.value,
                            "channel": channelNo,
                        },
                    }
                )
            )
    
    def switchChannel(self, resume_channels: Set[str], pause_channels: Set[str]) -> None:
        """
        Resume and pause channels to receive data from the server.

        Args:
            resume_channels (Set[str]): The set of channels to resume. Data will be received for symbols on these channels.
            pause_channels (Set[str]): The set of channels to pause. Data will be paused for symbols on these channels.
        """
        if (
            self.__ws_object is not None
            and self.__ws_object.sock
            and self.__ws_object.sock.connected
        ):
            self._subsinfo.updateChannels(pause_channels, resume_channels)
            self.__ws_object.send(
                json.dumps(
                    {
                        "type": 2,
                        "data": {
                            "resumeChannels": list(resume_channels),
                            "pauseChannels": list(pause_channels)
                        }
                    }
                )
            )

    def on_depth_update(self, ticker: str, message: Depth):
        """
        Callback function for depth update events.

        Args:
            ticker (str): The ticker symbol.
            message (Depth): The depth message.
        """
        try:
            if self.onDepthUpdate is not None:
                self.onDepthUpdate(ticker, message)
            else:
                if self.write_to_file:
                    self.tbtlogger.debug(f"{ticker}: {message}")
                else:
                    print(f"{ticker}: {message}")
                
        except Exception as e:
            self.tbtlogger.error(e)
            self.On_error(e)

    def on_error_message(self, message: str):
        """
        Callback function for error message events from the server

        Args:
            message (str): The error message.
        """
        try:
            if self.onErrorMsg is not None:
                self.onErrorMsg(message)
            else:
                print(f"error received from server: {message}")
        except Exception as e:
            self.tbtlogger.error(e)
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
                d = protomsg.SocketMessage()
                d.ParseFromString(message)
                if d.error:
                    self.on_error_message(d.msg)
                else:
                    self._datastore.updateDepth(d, self.on_depth_update, self.diff_only)
            

        except Exception as e:
            self.tbtlogger.error(e)
            self.On_error(e)

    def On_error(self, message: str) -> None:
        """
        Callback function for handling error events.

        Args:
            message (str): The error message.

        """
        if self.onerror is not None:
            self.onerror(message)
            self.tbtlogger.error(message)
        else:
            if self.write_to_file:
                self.tbtlogger.debug(f"Response:{message}")
            else:
                print(f"Error Response : {message}")

    def __on_open(self, ws):
        """
        Callback function for open events from the server

        Args:
            ws (WebSocket): The WebSocket object.
        """
        try:
            if self.__ws_object is None:
                self.__ws_object = ws
                self.ping_thread = threading.Thread(target=self.__ping)
                self.ping_thread.start()
                self.reconnect_attempts = 0
                self.reconnect_delay = 0
                self.on_open()

        except Exception as e:
            self.tbtlogger.error(e)
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
                        self.tbtlogger.debug(
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
                        self.tbtlogger.debug(
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
            self.tbtlogger.error(e)
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
                open_chans = self._subsinfo.getChannelInfo()
                self.switchChannel(self._subsinfo.getChannelInfo(), set())
                for channel in open_chans:
                    self.subscribe(self._subsinfo.getSymbolsInfo(channel), channel, self._subsinfo.getModeInfo(channel))
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
                    self.background_flag = False
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
            self.tbtlogger.error(e)

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
