

    var client = {
        broadcast:(data) => {
            //
            // scope.wss.clients.forEach(function each(client) {
            //     if (client.readyState === WebSocket.OPEN) {
            //         client.send(JSON.stringify(data));
            //     }
            // });

        },
        emit:(client_id, type, data) => {

            payload = JSON.stringify({type:type,data:data})
            clients['wsc_'+client_id].send(payload)

        }
    }

    module.exports = client
